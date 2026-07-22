from langchain_core.tools import tool


# ── Calendar ─────────────────────────────────────────────────────────


@tool
def list_calendar_events(start_date: str, end_date: str) -> str:
    """List Google Calendar events in a date range. Args: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)."""
    return f"[STUB] Would list calendar events from {start_date} to {end_date}. Google Calendar API not yet connected."


@tool
def create_calendar_event(
    summary: str, start_datetime: str, end_datetime: str, description: str = "", attendees: str = ""
) -> str:
    """Create a Google Calendar event. Args: summary (title), start_datetime (ISO), end_datetime (ISO), description (optional), attendees (comma-separated emails, optional)."""
    return f"[STUB] Would create event '{summary}' from {start_datetime} to {end_datetime}. Google Calendar API not yet connected."


@tool
def delete_calendar_event(event_id: str) -> str:
    """Delete a Google Calendar event by ID. Args: event_id."""
    return f"[STUB] Would delete event {event_id}. Google Calendar API not yet connected."


# ── Tasks ────────────────────────────────────────────────────────────


@tool
def list_tasks() -> str:
    """List all tasks from Google Tasks."""
    return "[STUB] Would list tasks from Google Tasks. API not yet connected."


@tool
def create_task(title: str, notes: str = "", due: str = "") -> str:
    """Create a Google Task. Args: title, notes (optional), due date YYYY-MM-DD (optional)."""
    return f"[STUB] Would create task '{title}'. Google Tasks API not yet connected."


@tool
def complete_task(task_id: str) -> str:
    """Mark a Google Task as completed. Args: task_id."""
    return f"[STUB] Would complete task {task_id}. Google Tasks API not yet connected."


# ── Gmail ────────────────────────────────────────────────────────────


@tool
def send_email(to: str, subject: str, body: str) -> str:
    """Send an email via Gmail. Args: to (email address), subject, body."""
    return f"[STUB] Would send email to {to} with subject '{subject}'. Gmail API not yet connected."


@tool
def draft_email(to: str, subject: str, body: str) -> str:
    """Create a Gmail draft. Args: to (email address), subject, body."""
    return f"[STUB] Would draft email to {to} with subject '{subject}'. Gmail API not yet connected."


# ── Contacts ─────────────────────────────────────────────────────────


@tool
def search_contacts(query: str) -> str:
    """Search Google Contacts by name. Returns email and phone. Args: query (name to search)."""
    return f"[STUB] Would search contacts for '{query}'. People API not yet connected."


# ── Maps ─────────────────────────────────────────────────────────────


@tool
def get_distance(origin: str, destination: str, mode: str = "driving") -> str:
    """Get travel distance and duration between two locations. Args: origin, destination, mode (driving/walking/transit)."""
    return f"[STUB] Would get distance from '{origin}' to '{destination}' by {mode}. Maps API not yet connected."


@tool
def get_directions(origin: str, destination: str, mode: str = "driving") -> str:
    """Get turn-by-turn directions. Args: origin, destination, mode (driving/walking/transit)."""
    return f"[STUB] Would get directions from '{origin}' to '{destination}' by {mode}. Maps API not yet connected."


tools = [
    list_calendar_events,
    create_calendar_event,
    delete_calendar_event,
    list_tasks,
    create_task,
    complete_task,
    send_email,
    draft_email,
    search_contacts,
    get_distance,
    get_directions,
]
