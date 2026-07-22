import asyncio
import json
import logging
import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.stt import transcribe
from app.agent.tts import synthesize
from app.core.config import settings
from app.core.database import async_session_factory
from app.core.security import verify_session_token
from app.models.session import Message, Session
from app.models.settings import UserSettings
from app.tasks.agent import run_agent_task

router = APIRouter()
logger = logging.getLogger(__name__)

sessions: dict[str, list[dict]] = {}


async def _drain_stream(
    redis_client: aioredis.Redis,
    stream_key: str,
    websocket: WebSocket,
    task_id: str,
    last_id: str = "0",
    timeout: float = 300,
) -> tuple[str | None, str, list[dict]]:
    deadline = asyncio.get_event_loop().time() + timeout
    response_text = None
    cards: list[dict] = []
    is_error = False

    while True:
        remaining = deadline - asyncio.get_event_loop().time()
        if remaining <= 0:
            await websocket.send_json({"type": "error", "message": "Agent timed out"})
            break

        try:
            entries = await redis_client.xread(
                {stream_key: last_id},
                count=10,
                block=int(min(remaining, 1.0) * 1000),
            )
        except asyncio.TimeoutError:
            continue

        if not entries:
            continue

        for _key, messages in entries:
            for entry_id, fields in messages:
                last_id = entry_id
                raw = fields.get("data") or fields.get(b"data")
                event = json.loads(raw)

                if event.get("task_id") != task_id:
                    continue

                await websocket.send_json(event)

                if event["type"] == "tool_result" and event.get("card"):
                    cards.append(event["card"])

                if event["type"] == "done":
                    response_text = event.get("response", "")
                    break
                elif event["type"] == "error":
                    is_error = True
                    break

            if response_text is not None or is_error:
                break

        if response_text is not None or is_error:
            break

    return response_text, last_id, cards


async def _persist_message(db: AsyncSession, session_id: str, role: str, content: str) -> None:
    msg = Message(session_id=session_id, role=role, content=content)
    db.add(msg)
    await db.commit()


async def _update_session_title(db: AsyncSession, session: Session, title: str) -> None:
    session.title = title
    await db.commit()


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket, session_id: str, token: str = Query(...)
):
    try:
        user_id = verify_session_token(token)
    except Exception:
        await websocket.close(code=4003, reason="Invalid token")
        return

    await websocket.accept()

    async with async_session_factory() as db:
        result = await db.execute(
            select(Session).where(Session.id == session_id, Session.user_id == user_id)
        )
        session = result.scalar_one_or_none()

        if session:
            msg_result = await db.execute(
                select(Message)
                .where(Message.session_id == session_id)
                .order_by(Message.created_at)
            )
            db_messages = [{"role": m.role, "content": m.content} for m in msg_result.scalars().all()]
        else:
            db_messages = []

        settings_result = await db.execute(
            select(UserSettings).where(UserSettings.user_id == user_id)
        )
        user_settings = settings_result.scalar_one_or_none()
        tts_enabled = user_settings.tts_enabled if user_settings else True
        tts_voice = user_settings.tts_voice if user_settings else "shubh"
        stt_language = user_settings.stt_language if user_settings else "unknown"

    if session_id not in sessions:
        sessions[session_id] = list(db_messages)

    message_history = sessions[session_id]

    redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    stream_key = f"stream:{session_id}"
    last_id = "0"
    first_user_message = True

    try:
        while True:
            data = await websocket.receive()

            if data["type"] == "websocket.disconnect":
                break

            if "text" not in data:
                continue

            try:
                payload = json.loads(data["text"])
            except json.JSONDecodeError:
                await websocket.send_json(
                    {"type": "error", "message": "Invalid JSON"}
                )
                continue

            msg_type = payload.get("type")

            if msg_type == "audio":
                try:
                    await websocket.send_json(
                        {"type": "status", "message": "Transcribing..."}
                    )
                    text = await transcribe(payload["data"], language_code=stt_language)
                except Exception as e:
                    logger.exception("STT failed")
                    await websocket.send_json(
                        {"type": "error", "message": f"Transcription failed: {e}"}
                    )
                    continue

                await websocket.send_json(
                    {"type": "transcription", "text": text}
                )

                user_text = text

            elif msg_type == "text":
                user_text = payload.get("data", "")
                if not user_text.strip():
                    continue

            else:
                continue

            message_history.append({"role": "user", "content": user_text})

            async with async_session_factory() as db:
                await _persist_message(db, session_id, "user", user_text)

                if first_user_message:
                    title = user_text[:50] + ("..." if len(user_text) > 50 else "")
                    result = await db.execute(
                        select(Session).where(Session.id == session_id)
                    )
                    sess = result.scalar_one_or_none()
                    if sess and sess.title == "New chat":
                        await _update_session_title(db, sess, title)
                    first_user_message = False

            task_id = str(uuid.uuid4())

            run_agent_task.apply_async(
                kwargs={
                    "task_id": task_id,
                    "session_id": session_id,
                    "message_history": list(message_history),
                    "user_id": user_id,
                },
                task_id=task_id,
                queue="agent",
            )

            response_text, last_id, cards = await _drain_stream(
                redis_client, stream_key, websocket, task_id, last_id
            )

            if response_text:
                message_history.append({"role": "assistant", "content": response_text})

                async with async_session_factory() as db:
                    for card in cards:
                        await _persist_message(db, session_id, "card", json.dumps(card))
                    await _persist_message(db, session_id, "assistant", response_text)

                if tts_enabled:
                    tts_chunks = []
                    try:
                        async for audio_chunk in synthesize(response_text, voice=tts_voice):
                            tts_chunks.append(audio_chunk)
                    except Exception as e:
                        logger.exception("TTS failed")
                        await websocket.send_json(
                            {"type": "error", "message": f"TTS failed: {e}"}
                        )

                    if tts_chunks:
                        await websocket.send_json({"type": "tts_start"})
                        for audio_chunk in tts_chunks:
                            await websocket.send_bytes(audio_chunk)
                        await websocket.send_json({"type": "tts_end"})

                await websocket.send_json(
                    {"type": "response", "text": response_text}
                )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.exception("WebSocket error")
        try:
            await websocket.close(code=1011, reason=str(e))
        except Exception:
            pass
    finally:
        sessions.pop(session_id, None)
        await redis_client.aclose()
