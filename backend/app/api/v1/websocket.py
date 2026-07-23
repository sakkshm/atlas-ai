import asyncio
import base64
import json
import logging
import re
import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.stt import transcribe
from app.agent.tts import synthesize
from app.agent.tools.errors import OAuthExpiredError
from app.core.config import settings
from app.core.database import async_session_factory
from app.core.ratelimit import ws_rate_limiter
from app.core.security import verify_session_token
from app.models.session import Message, Session
from app.models.settings import UserSettings
from app.models.user import User
from app.tasks.agent import run_agent_task

router = APIRouter()
logger = logging.getLogger(__name__)

sessions: dict[str, list[dict]] = {}
active_tasks: dict[str, str] = {}

MAX_TEXT_LENGTH = 5000
MAX_AUDIO_SIZE_MB = 10

CONFIRMATION_PATTERN = re.compile(
    r"^\s*(yes|yeah|yep|yup|ok|okay|confirm|confirmed|go ahead|proceed|do it|please|sure|absolutely|definitely)\s*[.!]*\s*$",
    re.IGNORECASE,
)


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
            await websocket.send_json({
                "type": "error",
                "message": "Agent timed out. Please try again.",
                "code": "agent_timeout",
            })
            break

        try:
            entries = await redis_client.xread(
                {stream_key: last_id},
                count=10,
                block=int(min(remaining, 1.0) * 1000),
            )
        except asyncio.TimeoutError:
            continue
        except Exception as e:
            logger.exception("Redis stream read error")
            await websocket.send_json({
                "type": "error",
                "message": "Connection error. Please try again.",
                "code": "stream_error",
            })
            is_error = True
            break

        if not entries:
            continue

        for _key, messages in entries:
            for entry_id, fields in messages:
                last_id = entry_id
                raw = fields.get("data") or fields.get(b"data")
                try:
                    event = json.loads(raw)
                except (json.JSONDecodeError, TypeError):
                    continue

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

        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        user_timezone = user.timezone if user else "UTC"

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
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid message format.",
                    "code": "invalid_json",
                })
                continue

            msg_type = payload.get("type")

            rate_limited, retry_after = ws_rate_limiter.check(session_id)
            if rate_limited:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Too many requests. Please wait {retry_after} seconds.",
                    "code": "rate_limited",
                    "retry_after": retry_after,
                })
                continue

            if active_tasks.get(session_id):
                await websocket.send_json({
                    "type": "error",
                    "message": "Please wait for the current request to finish.",
                    "code": "busy",
                })
                continue

            if msg_type == "audio":
                audio_data = payload.get("data", "")
                if not audio_data:
                    await websocket.send_json({
                        "type": "error",
                        "message": "No audio data received.",
                        "code": "invalid_input",
                    })
                    continue

                try:
                    audio_bytes = base64.b64decode(audio_data)
                    size_mb = len(audio_bytes) / (1024 * 1024)
                    if size_mb > MAX_AUDIO_SIZE_MB:
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Audio is too large ({size_mb:.1f}MB). Maximum is {MAX_AUDIO_SIZE_MB}MB.",
                            "code": "invalid_input",
                        })
                        continue
                except Exception:
                    await websocket.send_json({
                        "type": "error",
                        "message": "Invalid audio data.",
                        "code": "invalid_input",
                    })
                    continue

                try:
                    await websocket.send_json(
                        {"type": "status", "message": "Transcribing..."}
                    )
                    text = await transcribe(audio_data, language_code=stt_language)
                except OAuthExpiredError as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": e.message,
                        "code": "auth_expired",
                    })
                    continue
                except Exception as e:
                    logger.exception("STT failed")
                    await websocket.send_json({
                        "type": "error",
                        "message": "Could not transcribe audio. Please try again or type your message.",
                        "code": "stt_error",
                    })
                    continue

                await websocket.send_json(
                    {"type": "transcription", "text": text}
                )

                user_text = text

            elif msg_type == "text":
                user_text = payload.get("data", "")
                if not user_text.strip():
                    continue
                if len(user_text) > MAX_TEXT_LENGTH:
                    await websocket.send_json({
                        "type": "error",
                        "message": f"Message too long ({len(user_text)} chars). Maximum is {MAX_TEXT_LENGTH}.",
                        "code": "invalid_input",
                    })
                    continue

            else:
                continue

            message_history.append({"role": "user", "content": user_text})

            async with async_session_factory() as db:
                try:
                    await _persist_message(db, session_id, "user", user_text)
                except Exception as e:
                    logger.exception("Failed to persist user message: %s", e)

                if first_user_message:
                    title = user_text[:50] + ("..." if len(user_text) > 50 else "")
                    try:
                        result = await db.execute(
                            select(Session).where(Session.id == session_id)
                        )
                        sess = result.scalar_one_or_none()
                        if sess and sess.title == "New chat":
                            await _update_session_title(db, sess, title)
                    except Exception as e:
                        logger.exception("Failed to update session title: %s", e)
                    first_user_message = False

            task_id = str(uuid.uuid4())
            active_tasks[session_id] = task_id

            try:
                run_agent_task.apply_async(
                    kwargs={
                        "task_id": task_id,
                        "session_id": session_id,
                        "message_history": list(message_history),
                        "user_id": user_id,
                        "user_timezone": user_timezone,
                    },
                    task_id=task_id,
                    queue="agent",
                )
            except Exception as e:
                logger.exception("Failed to enqueue agent task")
                active_tasks.pop(session_id, None)
                await websocket.send_json({
                    "type": "error",
                    "message": "Failed to process your request. Please try again.",
                    "code": "task_error",
                })
                continue

            response_text, last_id, cards = await _drain_stream(
                redis_client, stream_key, websocket, task_id, last_id
            )

            active_tasks.pop(session_id, None)

            if response_text:
                message_history.append({"role": "assistant", "content": response_text})

                is_confirmation = bool(
                    re.search(r"\b(are you sure|confirm|should i|proceed|go ahead)\b", response_text, re.IGNORECASE)
                    and ("?" in response_text)
                )

                async with async_session_factory() as db:
                    try:
                        for card in cards:
                            await _persist_message(db, session_id, "card", json.dumps(card))
                        await _persist_message(db, session_id, "assistant", response_text)
                    except Exception as e:
                        logger.exception("Failed to persist assistant response: %s", e)

                if tts_enabled and not is_confirmation:
                    tts_chunks = []
                    try:
                        async for audio_chunk in synthesize(response_text, voice=tts_voice):
                            tts_chunks.append(audio_chunk)
                    except OAuthExpiredError as e:
                        await websocket.send_json({
                            "type": "error",
                            "message": e.message,
                            "code": "auth_expired",
                        })
                    except Exception as e:
                        logger.exception("TTS failed")
                        await websocket.send_json({
                            "type": "error",
                            "message": "Voice reply failed, but your response is shown as text.",
                            "code": "tts_error",
                        })

                    if tts_chunks:
                        await websocket.send_json({"type": "tts_start"})
                        for audio_chunk in tts_chunks:
                            await websocket.send_bytes(audio_chunk)
                        await websocket.send_json({"type": "tts_end"})

                if is_confirmation:
                    await websocket.send_json(
                        {"type": "hitl_request", "text": response_text}
                    )
                else:
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
        active_tasks.pop(session_id, None)
        ws_rate_limiter.cleanup(session_id)
        await redis_client.aclose()
