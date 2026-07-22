from typing import Any

from langgraph.prebuilt import ToolNode

from app.agent.tools.calendar import (
    create_calendar_event,
    delete_calendar_event,
    list_calendar_events,
    update_calendar_event,
)
from app.agent.tools.contacts import search_contacts
from app.agent.tools.gmail import draft_email, send_email
from app.agent.tools.maps import distance_matrix, get_directions
from app.agent.tools.tasks import (
    complete_task,
    create_task,
    delete_task,
    list_tasks,
)

tools = [
    list_calendar_events,
    create_calendar_event,
    update_calendar_event,
    delete_calendar_event,
    list_tasks,
    create_task,
    complete_task,
    delete_task,
    send_email,
    draft_email,
    search_contacts,
    distance_matrix,
    get_directions,
]


class AuthenticatedToolNode(ToolNode):
    """ToolNode that injects user_id from state into tool call args."""

    def _inject_user_id(self, state: dict[str, Any]):
        messages = state.get("messages", [])
        if not messages:
            return

        last_msg = messages[-1]
        if not hasattr(last_msg, "tool_calls"):
            return

        user_id = state.get("user_id", "")
        for tc in last_msg.tool_calls:
            if "user_id" not in tc.get("args", {}):
                tc["args"]["user_id"] = user_id

    def invoke(self, input, config=None, **kwargs):
        self._inject_user_id(input)
        return super().invoke(input, config, **kwargs)

    async def ainvoke(self, input, config=None, **kwargs):
        self._inject_user_id(input)
        return await super().ainvoke(input, config, **kwargs)
