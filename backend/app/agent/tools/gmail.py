import base64
import json
import logging
from email.message import EmailMessage
from typing import Annotated

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)


def _build_gmail_service(creds):
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def _create_mime_message(to: str, subject: str, body: str) -> str:
    msg = EmailMessage()
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    return base64.urlsafe_b64encode(msg.as_bytes()).decode()


@tool
async def draft_email(
    to: str,
    subject: str,
    body: str,
    user_id: Annotated[str, InjectedState("user_id")] = "",
) -> str:
    """Create a Gmail draft. Args: to (email address), subject, body."""
    try:
        from app.agent.tools.credentials import get_google_credentials

        creds = await get_google_credentials(user_id)
        service = _build_gmail_service(creds)

        raw = _create_mime_message(to, subject, body)

        draft = (
            service.users()
            .drafts()
            .create(userId="me", body={"message": {"raw": raw}})
            .execute()
        )

        return json.dumps({
            "id": draft["id"],
            "to": to,
            "subject": subject,
            "status": "draft_created",
            "card": {
                "type": "email_drafted",
                "to": to,
                "subject": subject,
                "body_preview": body[:200],
            },
        })

    except HttpError as e:
        logger.exception("Gmail API error")
        return json.dumps({"error": str(e)})
    except Exception as e:
        logger.exception("Failed to create draft")
        return json.dumps({"error": str(e)})


@tool
async def send_email(
    to: str,
    subject: str,
    body: str,
    user_id: Annotated[str, InjectedState("user_id")] = "",
) -> str:
    """Send an email via Gmail. Args: to (email address), subject, body."""
    try:
        from app.agent.tools.credentials import get_google_credentials

        creds = await get_google_credentials(user_id)
        service = _build_gmail_service(creds)

        raw = _create_mime_message(to, subject, body)

        message = (
            service.users()
            .messages()
            .send(userId="me", body={"raw": raw})
            .execute()
        )

        return json.dumps({
            "id": message["id"],
            "to": to,
            "subject": subject,
            "status": "sent",
            "card": {
                "type": "email_sent",
                "to": to,
                "subject": subject,
            },
        })

    except HttpError as e:
        logger.exception("Gmail API error")
        return json.dumps({"error": str(e)})
    except Exception as e:
        logger.exception("Failed to send email")
        return json.dumps({"error": str(e)})
