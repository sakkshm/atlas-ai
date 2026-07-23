from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_session_token,
    decrypt_token,
    encrypt_token,
    get_current_user,
)
from app.models.oauth import OAuthToken
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/contacts.readonly",
]


@router.get("/google/login")
async def google_login():
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
    }
    return RedirectResponse(
        f"{GOOGLE_AUTH_URL}?{urlencode(params)}",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )


@router.get("/google/callback")
async def google_callback(code: str = Query(...), db: AsyncSession = Depends(get_db)):
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
    if token_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to exchange code for tokens")

    token_data = token_resp.json()

    async with httpx.AsyncClient() as client:
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
        )
    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch user info")

    userinfo = userinfo_resp.json()

    result = await db.execute(select(User).where(User.email == userinfo["email"]))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=userinfo["email"],
            name=userinfo.get("name", ""),
            avatar_url=userinfo.get("picture"),
        )
        db.add(user)
        await db.flush()

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data.get("expires_in", 3600))

    result = await db.execute(
        select(OAuthToken).where(OAuthToken.user_id == user.id, OAuthToken.provider == "google")
    )
    oauth_token = result.scalar_one_or_none()

    if oauth_token:
        oauth_token.access_token = encrypt_token(token_data["access_token"])
        oauth_token.refresh_token = encrypt_token(token_data["refresh_token"]) if token_data.get("refresh_token") else oauth_token.refresh_token
        oauth_token.scopes = " ".join(SCOPES)
        oauth_token.expires_at = expires_at
    else:
        oauth_token = OAuthToken(
            user_id=user.id,
            provider="google",
            access_token=encrypt_token(token_data["access_token"]),
            refresh_token=encrypt_token(token_data["refresh_token"]) if token_data.get("refresh_token") else None,
            scopes=" ".join(SCOPES),
            expires_at=expires_at,
        )
        db.add(oauth_token)

    session_token = create_session_token(user.id)
    return RedirectResponse(
        f"{settings.FRONTEND_URL}/?token={session_token}",
        headers={"Cache-Control": "no-store, no-cache, must-revalidate"},
    )


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "avatar_url": user.avatar_url,
        "timezone": user.timezone,
    }


@router.put("/timezone")
async def update_timezone(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tz = body.get("timezone", "UTC")
    try:
        from zoneinfo import ZoneInfo
        ZoneInfo(tz)
    except (KeyError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid timezone")

    result = await db.execute(select(User).where(User.id == user.id))
    db_user = result.scalar_one_or_none()
    db_user.timezone = tz
    await db.commit()
    return {"timezone": tz}
