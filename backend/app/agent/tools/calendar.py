import json
import logging
from datetime import datetime, timezone
from typing import Annotated
from zoneinfo import ZoneInfo

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState
from googleapiclient.discovery import build

from app.agent.tools.errors import handle_tool_error

logger = logging.getLogger(__name__)


def _build_calendar_service(creds):
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def _get_tz(user_timezone: str) -> ZoneInfo:
    try:
        return ZoneInfo(user_timezone)
    except (KeyError, ValueError):
        return ZoneInfo("UTC")


@tool
async def list_calendar_events(
    start_date: str,
    end_date: str,
    user_id: Annotated[str, InjectedState("user_id")] = "",
    user_timezone: Annotated[str, InjectedState("user_timezone")] = "UTC",
) -> str:
    """List Google Calendar events in a date range. Args: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)."""
    try:
        from app.agent.tools.credentials import get_google_credentials

        creds = await get_google_credentials(user_id)
        service = _build_calendar_service(creds)

        tz = _get_tz(user_timezone)

        time_min = datetime.strptime(start_date, "%Y-%m-%d").replace(
            tzinfo=tz
        ).isoformat()
        time_max = datetime.strptime(end_date, "%Y-%m-%d").replace(
            hour=23, minute=59, tzinfo=tz
        ).isoformat()

        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=time_min,
                timeMax=time_max,
                maxResults=50,
                singleEvents=True,
                orderBy="startTime",
            )
            .execute()
        )

        events = events_result.get("items", [])
        results = []
        for event in events:
            start = event["start"].get("dateTime", event["start"].get("date"))
            end = event["end"].get("dateTime", event["end"].get("date"))
            results.append(
                {
                    "id": event["id"],
                    "summary": event.get("summary", "No title"),
                    "start": start,
                    "end": end,
                    "htmlLink": event.get("htmlLink", ""),
                }
            )

        return json.dumps({
            "events": results,
            "count": len(results),
            "card": {
                "type": "events_list",
                "events": results,
                "count": len(results),
                "date_range": f"{start_date} to {end_date}",
            },
        })

    except Exception as e:
        return handle_tool_error(e, "Failed to list calendar events")


@tool
async def create_calendar_event(
    summary: str,
    start_datetime: str,
    end_datetime: str,
    description: str = "",
    attendees: str = "",
    user_id: Annotated[str, InjectedState("user_id")] = "",
    user_timezone: Annotated[str, InjectedState("user_timezone")] = "UTC",
) -> str:
    """Create a Google Calendar event. Args: summary (title), start_datetime (ISO), end_datetime (ISO), description (optional), attendees (comma-separated emails, optional)."""
    try:
        from app.agent.tools.credentials import get_google_credentials

        creds = await get_google_credentials(user_id)
        service = _build_calendar_service(creds)

        event_body = {
            "summary": summary,
            "start": {"dateTime": start_datetime, "timeZone": user_timezone},
            "end": {"dateTime": end_datetime, "timeZone": user_timezone},
        }

        if description:
            event_body["description"] = description

        if attendees:
            event_body["attendees"] = [
                {"email": email.strip()} for email in attendees.split(",") if email.strip()
            ]

        created = (
            service.events()
            .insert(
                calendarId="primary",
                body=event_body,
                sendUpdates="all" if attendees else "none",
            )
            .execute()
        )

        return json.dumps({
            "id": created["id"],
            "summary": created.get("summary"),
            "start": created["start"].get("dateTime", created["start"].get("date")),
            "end": created["end"].get("dateTime", created["end"].get("date")),
            "htmlLink": created.get("htmlLink", ""),
            "status": "created",
            "card": {
                "type": "event_created",
                "summary": created.get("summary"),
                "start": created["start"].get("dateTime", created["start"].get("date")),
                "end": created["end"].get("dateTime", created["end"].get("date")),
                "htmlLink": created.get("htmlLink", ""),
            },
        })

    except Exception as e:
        return handle_tool_error(e, "Failed to create calendar event")


@tool
async def update_calendar_event(
    event_id: str,
    summary: str = "",
    start_datetime: str = "",
    end_datetime: str = "",
    description: str = "",
    user_id: Annotated[str, InjectedState("user_id")] = "",
    user_timezone: Annotated[str, InjectedState("user_timezone")] = "UTC",
) -> str:
    """Update an existing Google Calendar event. Args: event_id, summary (optional), start_datetime (optional, ISO), end_datetime (optional, ISO), description (optional)."""
    try:
        from app.agent.tools.credentials import get_google_credentials

        creds = await get_google_credentials(user_id)
        service = _build_calendar_service(creds)

        event_body = {}
        if summary:
            event_body["summary"] = summary
        if start_datetime:
            event_body["start"] = {"dateTime": start_datetime, "timeZone": user_timezone}
        if end_datetime:
            event_body["end"] = {"dateTime": end_datetime, "timeZone": user_timezone}
        if description:
            event_body["description"] = description

        updated = (
            service.events()
            .patch(
                calendarId="primary",
                eventId=event_id,
                body=event_body,
            )
            .execute()
        )

        return json.dumps({
            "id": updated["id"],
            "summary": updated.get("summary"),
            "start": updated["start"].get("dateTime", updated["start"].get("date")),
            "end": updated["end"].get("dateTime", updated["end"].get("date")),
            "htmlLink": updated.get("htmlLink", ""),
            "status": "updated",
            "card": {
                "type": "event_updated",
                "summary": updated.get("summary"),
                "start": updated["start"].get("dateTime", updated["start"].get("date")),
                "end": updated["end"].get("dateTime", updated["end"].get("date")),
                "htmlLink": updated.get("htmlLink", ""),
            },
        })

    except Exception as e:
        return handle_tool_error(e, "Failed to update calendar event")


@tool
async def delete_calendar_event(
    event_id: str,
    user_id: Annotated[str, InjectedState("user_id")] = "",
) -> str:
    """Delete a Google Calendar event by ID. Args: event_id."""
    try:
        from app.agent.tools.credentials import get_google_credentials

        creds = await get_google_credentials(user_id)
        service = _build_calendar_service(creds)

        service.events().delete(
            calendarId="primary",
            eventId=event_id,
            sendUpdates="none",
        ).execute()

        return json.dumps({
            "status": "deleted",
            "event_id": event_id,
            "card": {
                "type": "event_deleted",
                "event_id": event_id,
            },
        })

    except Exception as e:
        return handle_tool_error(e, "Failed to delete calendar event")
