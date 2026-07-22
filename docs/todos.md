# Todos

## Completed
- [x] Remove 3s delay from list_calendar_events stub tool

## In Progress
- [ ] Phase 5: Google API Tool Suite — Replace 11 stub tools with real Google API integrations
  - [ ] Add dependencies to pyproject.toml (google-api-python-client, google-auth-httplib2, google-auth-oauthlib)
  - [ ] Add contacts.readonly scope to auth.py
  - [ ] Add user_id to AgentState
  - [ ] Create tools/credentials.py — get_google_credentials(user_id)
  - [ ] Create tools/calendar.py — list_events, create_event, update_event, delete_event
  - [ ] Create tools/tasks.py — list_tasks, create_task, complete_task, delete_task
  - [ ] Create tools/gmail.py — draft_email, send_email
  - [ ] Create tools/contacts.py — search_contacts
  - [ ] Create tools/maps.py — distance_matrix, get_directions (API key auth)
  - [ ] Create tools/__init__.py — exports tools list + AuthenticatedToolNode
  - [ ] Delete old agent/tools.py, update graph.py with AuthenticatedToolNode
  - [ ] Update tasks/agent.py — accept user_id, pass in state, extract tool cards
  - [ ] Update websocket.py — extract user_id from JWT, pass to task
  - [ ] Add compelling system prompt line about confirming destructive actions before executing (Option B HITL)
  - [ ] Frontend: ToolCard.tsx component + tool_result event handler in App.tsx

## Pending
- [ ] UX: Show response text immediately on 'done' event, remove 'Generating audio...' status (Option A)
- [ ] HITL: Add proper interrupt()-based human-in-the-loop (LangGraph checkpointing + WebSocket confirmation flow) — deferred to future phase
