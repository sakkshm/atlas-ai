from datetime import datetime, timezone

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.security import decrypt_token, encrypt_token
from app.models.oauth import OAuthToken

SCOPES_MAP = {
    "calendar": ["https://www.googleapis.com/auth/calendar"],
    "tasks": ["https://www.googleapis.com/auth/tasks"],
    "gmail": [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
    ],
    "contacts": ["https://www.googleapis.com/auth/contacts.readonly"],
}


async def get_google_credentials(
    user_id: str, required_scopes: list[str] | None = None
) -> Credentials:
    async with async_session_factory() as session:
        result = await session.execute(
            select(OAuthToken).where(
                OAuthToken.user_id == user_id, OAuthToken.provider == "google"
            )
        )
        oauth_token = result.scalar_one_or_none()

        if not oauth_token:
            raise ValueError(f"No Google OAuth token found for user {user_id}")

        access_token = decrypt_token(oauth_token.access_token)
        refresh_token = (
            decrypt_token(oauth_token.refresh_token)
            if oauth_token.refresh_token
            else None
        )

        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=None,
            client_secret=None,
            scopes=oauth_token.scopes.split() if oauth_token.scopes else None,
        )

        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            oauth_token.access_token = encrypt_token(creds.token)
            oauth_token.expires_at = datetime.now(timezone.utc) + (
                creds.expiry - datetime.now(timezone.utc)
                if creds.expiry
                else None
            )
            await session.commit()

        return creds


def get_credentials_sync(user_id: str) -> Credentials:
    import asyncio

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(get_google_credentials(user_id))
    finally:
        loop.close()
