import asyncio
import base64
import logging
from io import BytesIO

from sarvamai import SarvamAI

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: SarvamAI | None = None


def _get_client() -> SarvamAI:
    global _client
    if _client is None:
        _client = SarvamAI(api_subscription_key=settings.SARVAM_API_KEY)
    return _client


def _transcribe_sync(audio_bytes: bytes) -> str:
    client = _get_client()
    audio_file = BytesIO(audio_bytes)
    audio_file.name = "audio.webm"
    response = client.speech_to_text.transcribe(
        file=audio_file,
        model="saaras:v3",
        mode="transcribe",
        language_code="unknown",
    )
    return response.transcript


async def transcribe(audio_b64: str) -> str:
    audio_bytes = base64.b64decode(audio_b64)
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _transcribe_sync, audio_bytes)
