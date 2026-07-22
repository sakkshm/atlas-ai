from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    tts_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    tts_voice: Mapped[str] = mapped_column(String(50), default="shubh")
    stt_language: Mapped[str] = mapped_column(String(20), default="unknown")
