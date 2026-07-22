from typing import Any

from langgraph.prebuilt import ToolNode

from app.agent.tools.calendar import (
    create_calendar_event,
    delete_calendar_event,
    list_calendar_events,
    update_calendar_event,
)
from app.agent.tools.contacts import search_contacts
from app.agent.tools.gmail import draft_email, list_emails, read_email, send_email
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
    list_emails,
    read_email,
    search_contacts,
    distance_matrix,
    get_directions,
]
