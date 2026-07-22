import json
import logging
from typing import Annotated

from langchain_core.tools import tool
from langgraph.prebuilt import InjectedState
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)


def _build_tasks_service(creds):
    return build("tasks", "v1", credentials=creds, cache_discovery=False)


@tool
async def list_tasks(
    tasklist: str = "@default",
    user_id: Annotated[str, InjectedState("user_id")] = "",
) -> str:
    """List all tasks from Google Tasks. Args: tasklist (optional, defaults to @default)."""
    try:
        from app.agent.tools.credentials import get_google_credentials

        creds = await get_google_credentials(user_id)
        service = _build_tasks_service(creds)

        results = (
            service.tasks()
            .list(
                tasklist=tasklist,
                maxResults=100,
                showCompleted=True,
                showDeleted=False,
                showHidden=True,
            )
            .execute()
        )

        tasks = results.get("items", [])
        task_list = []
        for task in tasks:
            task_list.append(
                {
                    "id": task["id"],
                    "title": task.get("title", ""),
                    "notes": task.get("notes", ""),
                    "status": task.get("status", "needsAction"),
                    "due": task.get("due", ""),
                    "completed": task.get("completed", ""),
                    "webViewLink": task.get("webViewLink", ""),
                }
            )

        return json.dumps({
            "tasks": task_list,
            "count": len(task_list),
            "card": {
                "type": "tasks_list",
                "tasks": task_list,
                "count": len(task_list),
            },
        })

    except HttpError as e:
        logger.exception("Tasks API error")
        return json.dumps({"error": str(e)})
    except Exception as e:
        logger.exception("Failed to list tasks")
        return json.dumps({"error": str(e)})


@tool
async def create_task(
    title: str,
    notes: str = "",
    due: str = "",
    user_id: Annotated[str, InjectedState("user_id")] = "",
) -> str:
    """Create a Google Task. Args: title, notes (optional), due date YYYY-MM-DD (optional)."""
    try:
        from app.agent.tools.credentials import get_google_credentials

        creds = await get_google_credentials(user_id)
        service = _build_tasks_service(creds)

        task_body = {"title": title}
        if notes:
            task_body["notes"] = notes
        if due:
            task_body["due"] = f"{due}T00:00:00.000Z"

        created = (
            service.tasks()
            .insert(tasklist="@default", body=task_body)
            .execute()
        )

        return json.dumps({
            "id": created["id"],
            "title": created.get("title"),
            "notes": created.get("notes", ""),
            "status": created.get("status"),
            "due": created.get("due", ""),
            "webViewLink": created.get("webViewLink", ""),
            "status_action": "created",
            "card": {
                "type": "task_created",
                "title": created.get("title"),
                "due": created.get("due", ""),
                "webViewLink": created.get("webViewLink", ""),
            },
        })

    except HttpError as e:
        logger.exception("Tasks API error")
        return json.dumps({"error": str(e)})
    except Exception as e:
        logger.exception("Failed to create task")
        return json.dumps({"error": str(e)})


@tool
async def complete_task(
    task_id: str,
    user_id: Annotated[str, InjectedState("user_id")] = "",
) -> str:
    """Mark a Google Task as completed. Args: task_id."""
    try:
        from app.agent.tools.credentials import get_google_credentials

        creds = await get_google_credentials(user_id)
        service = _build_tasks_service(creds)

        updated = (
            service.tasks()
            .patch(
                tasklist="@default",
                task=task_id,
                body={"status": "completed"},
            )
            .execute()
        )

        return json.dumps({
            "id": updated["id"],
            "title": updated.get("title"),
            "status": "completed",
            "status_action": "completed",
            "card": {
                "type": "task_completed",
                "title": updated.get("title"),
            },
        })

    except HttpError as e:
        logger.exception("Tasks API error")
        return json.dumps({"error": str(e)})
    except Exception as e:
        logger.exception("Failed to complete task")
        return json.dumps({"error": str(e)})


@tool
async def delete_task(
    task_id: str,
    user_id: Annotated[str, InjectedState("user_id")] = "",
) -> str:
    """Delete a Google Task. Args: task_id."""
    try:
        from app.agent.tools.credentials import get_google_credentials

        creds = await get_google_credentials(user_id)
        service = _build_tasks_service(creds)

        service.tasks().delete(tasklist="@default", task=task_id).execute()

        return json.dumps({
            "status": "deleted",
            "task_id": task_id,
            "card": {
                "type": "task_deleted",
                "task_id": task_id,
            },
        })

    except HttpError as e:
        logger.exception("Tasks API error")
        return json.dumps({"error": str(e)})
    except Exception as e:
        logger.exception("Failed to delete task")
        return json.dumps({"error": str(e)})
