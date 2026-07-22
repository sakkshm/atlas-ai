import json
import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.agent.graph import run_agent
from app.agent.stt import transcribe
from app.agent.tts import synthesize
from app.core.security import verify_session_token

router = APIRouter()
logger = logging.getLogger(__name__)

sessions: dict[str, list[dict]] = {}


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket, session_id: str, token: str = Query(...)
):
    try:
        verify_session_token(token)
    except Exception:
        await websocket.close(code=4003, reason="Invalid token")
        return

    await websocket.accept()
    if session_id not in sessions:
        sessions[session_id] = []

    message_history = sessions[session_id]

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
                    text = await transcribe(payload["data"])
                except Exception as e:
                    logger.exception("STT failed")
                    await websocket.send_json(
                        {"type": "error", "message": f"Transcription failed: {e}"}
                    )
                    continue

                await websocket.send_json(
                    {"type": "transcription", "text": text}
                )

                message_history.append({"role": "user", "content": text})

                await websocket.send_json(
                    {"type": "status", "message": "Thinking..."}
                )
                try:
                    response = await run_agent(message_history, session_id)
                except Exception as e:
                    logger.exception("Agent failed")
                    await websocket.send_json(
                        {"type": "error", "message": f"Agent failed: {e}"}
                    )
                    message_history.pop()
                    continue

                message_history.append({"role": "assistant", "content": response})

                tts_chunks = []
                try:
                    async for audio_chunk in synthesize(response):
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
                    {"type": "response", "text": response}
                )

            elif msg_type == "text":
                user_text = payload.get("data", "")
                if not user_text.strip():
                    continue

                message_history.append({"role": "user", "content": user_text})

                await websocket.send_json(
                    {"type": "status", "message": "Thinking..."}
                )
                try:
                    response = await run_agent(message_history, session_id)
                except Exception as e:
                    logger.exception("Agent failed")
                    await websocket.send_json(
                        {"type": "error", "message": f"Agent failed: {e}"}
                    )
                    message_history.pop()
                    continue

                message_history.append({"role": "assistant", "content": response})

                tts_chunks = []
                try:
                    async for audio_chunk in synthesize(response):
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
                    {"type": "response", "text": response}
                )

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.exception("WebSocket error")
        try:
            await websocket.close(code=1011, reason=str(e))
        except Exception:
            pass
