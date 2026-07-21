from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/atlas_ai"
    REDIS_URL: str = "redis://localhost:6379/0"

    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    GOOGLE_MAPS_API_KEY: str = ""

    GEMINI_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.0-flash"

    WHISPER_MODEL_SIZE: str = "base"
    TTS_VOICE: str = "en-US-AriaNeural"

    FERNET_KEY: str = ""

    VITE_API_URL: str = "http://localhost:8000"
    VITE_WS_URL: str = "ws://localhost:8000"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
