import asyncio
import base64
from collections.abc import AsyncGenerator

from sarvamai import SarvamAI

from app.core.config import settings

_client: SarvamAI | None = None


def _get_client() -> SarvamAI:
    global _client
    if _client is None:
        _client = SarvamAI(api_subscription_key=settings.SARVAM_API_KEY)
    return _client


def _synthesize_sync(text: str) -> bytes:
    client = _get_client()
    response = client.text_to_speech.convert(
        text=text,
        target_language_code="en-IN",
        speaker="shubh",
        model="bulbul:v3",
        speech_sample_rate=24000,
        output_audio_codec="wav",
    )
    if not response.audios:
        raise RuntimeError("TTS returned no audio chunks")
    return base64.b64decode(response.audios[0])


async def synthesize(text: str) -> AsyncGenerator[bytes, None]:
    if not text.strip():
        return

    loop = asyncio.get_event_loop()
    audio = await loop.run_in_executor(None, _synthesize_sync, text)
    yield audio
