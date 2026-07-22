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


def _parse_headers(headers: list[dict], names: list[str]) -> dict[str, str]:
    mapping = {h["name"].lower(): h["value"] for h in headers}
    return {name: mapping.get(name, "") for name in names}


def _get_body_text(payload: dict) -> str:
    """Recursively extract plain text body from a Gmail message payload."""
    mime = payload.get("mimeType", "")

    if mime == "text/plain" and "data" in payload.get("body", {}):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode(
            "utf-8", errors="replace"
        )

    parts = payload.get("parts", [])
    for part in parts:
        result = _get_body_text(part)
        if result:
            return result

    return ""


@tool
async def list_emails(
    query: str = "",
    max_results: int = 10,
    user_id: Annotated[str, InjectedState("user_id")] = "",
) -> str:
    """Search and list Gmail emails. Args: query (Gmail search syntax, e.g. "from:alice@example.com", "subject:meeting", "is:unread"), max_results (default 10)."""
    try:
        from app.agent.tools.credentials import get_google_credentials

        creds = await get_google_credentials(user_id)
        service = _build_gmail_service(creds)

        results = (
            service.users()
            .messages()
            .list(
                userId="me",
                q=query,
                maxResults=max_results,
            )
            .execute()
        )

        message_ids = results.get("messages", [])
        if not message_ids:
            return json.dumps({
                "emails": [],
                "count": 0,
                "card": {"type": "emails_list", "emails": [], "count": 0, "query": query},
            })

        emails = []
        for msg_ref in message_ids[:max_results]:
            msg = (
                service.users()
                .messages()
                .get(userId="me", id=msg_ref["id"], format="metadata",
                     metadataHeaders=["From", "To", "Subject", "Date"])
                .execute()
            )

            headers = msg.get("payload", {}).get("headers", [])
            parsed = _parse_headers(headers, ["from", "to", "subject", "date"])

            emails.append({
                "id": msg["id"],
                "threadId": msg.get("threadId", ""),
                "from": parsed["from"],
                "to": parsed["to"],
                "subject": parsed["subject"],
                "date": parsed["date"],
                "snippet": msg.get("snippet", ""),
                "is_unread": "UNREAD" in msg.get("labelIds", []),
            })

        return json.dumps({
            "emails": emails,
            "count": len(emails),
            "card": {
                "type": "emails_list",
                "emails": emails,
                "count": len(emails),
                "query": query,
            },
        })

    except HttpError as e:
        logger.exception("Gmail API error")
        return json.dumps({"error": str(e)})
    except Exception as e:
        logger.exception("Failed to list emails")
        return json.dumps({"error": str(e)})


@tool
async def read_email(
    message_id: str,
    user_id: Annotated[str, InjectedState("user_id")] = "",
) -> str:
    """Read the full content of a Gmail email by its message ID. Args: message_id."""
    try:
        from app.agent.tools.credentials import get_google_credentials

        creds = await get_google_credentials(user_id)
        service = _build_gmail_service(creds)

        msg = (
            service.users()
            .messages()
            .get(userId="me", id=message_id, format="full")
            .execute()
        )

        headers = msg.get("payload", {}).get("headers", [])
        parsed = _parse_headers(headers, ["from", "to", "subject", "date"])

        body_text = _get_body_text(msg.get("payload", {}))

        return json.dumps({
            "id": msg["id"],
            "threadId": msg.get("threadId", ""),
            "from": parsed["from"],
            "to": parsed["to"],
            "subject": parsed["subject"],
            "date": parsed["date"],
            "body": body_text,
            "snippet": msg.get("snippet", ""),
            "labels": msg.get("labelIds", []),
            "card": {
                "type": "email_read",
                "from": parsed["from"],
                "to": parsed["to"],
                "subject": parsed["subject"],
                "date": parsed["date"],
                "body_preview": body_text[:300],
            },
        })

    except HttpError as e:
        logger.exception("Gmail API error")
        return json.dumps({"error": str(e)})
    except Exception as e:
        logger.exception("Failed to read email")
        return json.dumps({"error": str(e)})
