from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.settings import UserSettings
from app.models.user import User

router = APIRouter(prefix="/user", tags=["user"])


class UserSettingsResponse(BaseModel):
    tts_enabled: bool
    tts_voice: str
    stt_language: str


class UpdateSettingsRequest(BaseModel):
    tts_enabled: bool | None = None
    tts_voice: str | None = None
    stt_language: str | None = None


DEFAULTS = UserSettingsResponse(tts_enabled=True, tts_voice="shubh", stt_language="unknown")


@router.get("/settings", response_model=UserSettingsResponse)
async def get_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    settings = result.scalar_one_or_none()
    if not settings:
        return DEFAULTS
    return UserSettingsResponse(
        tts_enabled=settings.tts_enabled,
        tts_voice=settings.tts_voice,
        stt_language=settings.stt_language,
    )


@router.put("/settings", response_model=UserSettingsResponse)
async def update_settings(
    body: UpdateSettingsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    settings = result.scalar_one_or_none()

    if not settings:
        settings = UserSettings(
            user_id=user.id,
            tts_enabled=body.tts_enabled if body.tts_enabled is not None else True,
            tts_voice=body.tts_voice or "shubh",
            stt_language=body.stt_language or "unknown",
        )
        db.add(settings)
    else:
        if body.tts_enabled is not None:
            settings.tts_enabled = body.tts_enabled
        if body.tts_voice is not None:
            settings.tts_voice = body.tts_voice
        if body.stt_language is not None:
            settings.stt_language = body.stt_language

    await db.flush()
    return UserSettingsResponse(
        tts_enabled=settings.tts_enabled,
        tts_voice=settings.tts_voice,
        stt_language=settings.stt_language,
    )
