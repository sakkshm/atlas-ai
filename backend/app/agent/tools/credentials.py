import asyncio
import logging
from datetime import datetime, timezone

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.agent.tools.errors import OAuthExpiredError
from app.core.config import settings
from app.core.security import decrypt_token, encrypt_token
from app.models.oauth import OAuthToken

logger = logging.getLogger(__name__)

MAX_REFRESH_RETRIES = 2


async def get_google_credentials(
    user_id: str, required_scopes: list[str] | None = None
) -> Credentials:
    engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
    try:
        session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
        async with session_factory() as session:
            result = await session.execute(
                select(OAuthToken).where(
                    OAuthToken.user_id == user_id, OAuthToken.provider == "google"
                )
            )
            oauth_token = result.scalar_one_or_none()

            if not oauth_token:
                raise OAuthExpiredError(
                    "No Google account connected. Please sign in with Google."
                )

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
                client_id=settings.GOOGLE_CLIENT_ID,
                client_secret=settings.GOOGLE_CLIENT_SECRET,
                scopes=oauth_token.scopes.split() if oauth_token.scopes else None,
            )

            if creds.expired and creds.refresh_token:
                last_error = None
                for attempt in range(MAX_REFRESH_RETRIES):
                    try:
                        creds.refresh(Request())
                        break
                    except Exception as e:
                        last_error = e
                        logger.warning(
                            "Token refresh attempt %d/%d failed: %s",
                            attempt + 1,
                            MAX_REFRESH_RETRIES,
                            e,
                        )
                        if attempt < MAX_REFRESH_RETRIES - 1:
                            await asyncio.sleep(1)
                else:
                    if last_error:
                        msg = str(last_error).lower()
                        if "token_expired" in msg or "invalid_grant" in msg or "revoked" in msg:
                            raise OAuthExpiredError(
                                "Google access has been revoked. Please sign in again."
                            )
                        raise OAuthExpiredError(
                            "Failed to refresh Google token. Please sign in again."
                        )

                oauth_token.access_token = encrypt_token(creds.token)
                if creds.expiry:
                    oauth_token.expires_at = creds.expiry
                await session.commit()

            return creds
    finally:
        await engine.dispose()
