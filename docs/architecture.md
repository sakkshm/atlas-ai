# Architecture

## System Overview

Atlas is a voice-first AI assistant for Google Workspace. Users interact via text or voice through a WebSocket connection. A LangGraph-based agent powered by Google Gemini reasons over user intent, calls Google APIs (Calendar, Gmail, Tasks, Contacts, Maps), and streams results back in real time. Speech-to-text and text-to-speech are handled by SarvamAI.

```
                      ┌──────────────────────────┐
                      │    React / Vite Frontend  │
                      │  Glass UI / Dark Theme    │
                      └────────────┬─────────────┘
                                   │
                    REST / OAuth   │  WebSocket Stream
                                  ╲│/
                      ┌──────────────────────────┐
                      │      FastAPI Backend       │
                      │   OAuth2 / JWT / WS Route  │
                      └──────┬───────────┬────────┘
                             │           │
                  Read/Write │           │ Enqueue / Stream
                  Tokens     ▼           ▼
              ┌──────────┐     ┌──────────┐
              │ Postgres  │     │  Redis   │
              │ (tokens)  │     │ (broker) │
              └──────────┘     └────┬─────┘
                                    │
                               Worker pulls job
                                    ▼
                      ┌──────────────────────────┐
                      │    Celery Worker           │
                      │    LangGraph Agent         │
                      │                            │
                      │    1. SarvamAI STT API     │
                      │    2. Gemini LLM Reasoning  │
                      │    3. Google API Tools      │
                      │    4. SarvamAI TTS API      │
                      └──────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python 3.11+ |
| Agent | LangGraph (modular tool-calling) |
| Task Queue | Celery (Redis broker) |
| Streaming | WebSocket + Redis Streams |
| Database | PostgreSQL (async SQLAlchemy) |
| Auth | Google OAuth2, JWT sessions |
| Encryption | AES-256 (Fernet) |
| LLM | Gemini 2.0 Flash |
| STT | SarvamAI API (saaras:v3) |
| TTS | SarvamAI API (bulbul:v3) |
| Frontend | React, Vite, TypeScript, Tailwind |
| Typography | Instrument Serif, Inter Variable |
| Infra | Docker Compose |

## Project Structure

```
atlas-ai/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/           # 3 migrations
│   └── app/
│       ├── main.py             # FastAPI app, lifespan, CORS
│       ├── core/
│       │   ├── config.py       # Pydantic BaseSettings
│       │   ├── database.py     # Async SQLAlchemy engine + session
│       │   ├── security.py     # Fernet encryption, JWT, auth deps
│       │   └── celery.py       # Celery app initialization
│       ├── models/
│       │   ├── user.py         # User, OAuthToken
│       │   ├── session.py      # Session, Message
│       │   └── settings.py     # UserSettings
│       ├── api/v1/
│       │   ├── auth.py         # Google OAuth2 login/callback/me
│       │   ├── sessions.py     # CRUD for chat sessions
│       │   ├── user_settings.py # TTS/STT preferences
│       │   └── websocket.py    # WebSocket handler + Redis stream drain
│       ├── agent/
│       │   ├── graph.py        # LangGraph StateGraph definition
│       │   ├── state.py        # AgentState TypedDict
│       │   ├── prompts.py      # System prompt
│       │   ├── llm.py          # Gemini wrapper + bound tools
│       │   ├── stt.py          # SarvamAI speech-to-text
│       │   ├── tts.py          # SarvamAI text-to-speech
│       │   └── tools/
│       │       ├── __init__.py # Tool registry (15 tools)
│       │       ├── credentials.py # OAuth token retrieval + auto-refresh
│       │       ├── calendar.py    # Calendar API tools
│       │       ├── gmail.py       # Gmail API tools
│       │       ├── tasks.py       # Tasks API tools
│       │       ├── contacts.py    # People API tools
│       │       └── maps.py        # Maps REST API tools
│       └── tasks/
│           └── agent.py        # Celery task wrapping LangGraph
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx             # Router + auth gate
        ├── index.css           # Theme tokens, glass utilities, fonts
        ├── components/
        │   ├── LoginButton.tsx
        │   ├── ChatMessage.tsx   # Text bubbles (Markdown for assistant)
        │   ├── VoiceBar.tsx      # Mic button + text input
        │   ├── ToolCard.tsx      # Router → individual card components
        │   ├── cards/
        │   │   ├── CalendarEventCard.tsx
        │   │   ├── TaskItemCard.tsx
        │   │   ├── EmailDraftCard.tsx
        │   │   └── RouteDistanceCard.tsx
        │   └── layout/
        │       ├── Layout.tsx      # Framed viewport, ambient blobs
        │       ├── Sidebar.tsx     # Session list, user badge
        │       └── Header.tsx      # Mobile header
        ├── hooks/
        │   ├── useAuth.ts
        │   ├── useWebSocket.ts
        │   ├── useSessions.ts
        │   ├── useSettings.ts
        │   ├── useTTS.ts
        │   ├── useAudioRecorder.ts
        │   └── useTheme.ts
        ├── pages/
        │   ├── LandingPage.tsx
        │   ├── ChatPage.tsx
        │   └── SettingsPage.tsx
        └── lib/
            └── api.ts          # REST client (fetch)
```

## Database Schema

```
users
  id            VARCHAR(36)  PK
  email         VARCHAR(255) UNIQUE, INDEX
  name          VARCHAR(255) NOT NULL
  avatar_url    VARCHAR(512) NULLABLE
  created_at    TIMESTAMPTZ  DEFAULT now()

oauth_tokens
  id            VARCHAR(36)  PK
  user_id       VARCHAR(36)  FK → users.id
  provider      VARCHAR(50)  NOT NULL
  access_token  VARCHAR(2048) Fernet-encrypted
  refresh_token VARCHAR(2048) Fernet-encrypted, NULLABLE
  scopes        VARCHAR(1024) NOT NULL
  expires_at    TIMESTAMPTZ  NOT NULL
  created_at    TIMESTAMPTZ  DEFAULT now()

sessions
  id            VARCHAR(36)  PK
  user_id       VARCHAR(36)  FK → users.id, INDEX
  title         VARCHAR(255) DEFAULT 'New chat'
  created_at    TIMESTAMPTZ  DEFAULT now()
  updated_at    TIMESTAMPTZ  DEFAULT now() ON UPDATE now()

messages
  id            VARCHAR(36)  PK
  session_id    VARCHAR(36)  FK → sessions.id, INDEX
  role          VARCHAR(20)  NOT NULL ('user'|'assistant'|'card')
  content       TEXT          NOT NULL
  created_at    TIMESTAMPTZ  DEFAULT now()

user_settings
  user_id       VARCHAR(36)  PK, FK → users.id
  tts_enabled   BOOLEAN      DEFAULT true
  tts_voice     VARCHAR(50)  DEFAULT 'shubh'
  stt_language  VARCHAR(20)  DEFAULT 'unknown'
```

Migrations managed by Alembic (3 revisions).

## Authentication Flow

```
1. User clicks "Sign in with Google"
   → Frontend redirects to GET /api/v1/auth/google/login
   → Backend constructs Google OAuth consent URL with scopes:
     openid, email, profile, calendar, tasks,
     gmail.send, gmail.readonly, contacts.readonly

2. User grants consent
   → Google redirects to GET /api/v1/auth/google/callback?code=...

3. Backend exchanges code for tokens
   → Fetches userinfo from Google
   → Upserts User record
   → Encrypts access_token + refresh_token with Fernet (AES-256)
   → Upserts OAuthToken record
   → Creates JWT (HS256, 7-day expiry)
   → Redirects to frontend: /?token={jwt}

4. Frontend stores JWT in localStorage
   → useAuth() extracts token, calls GET /api/v1/auth/me
   → All subsequent requests use Authorization: Bearer {token}

5. Token refresh
   → Before each Google API call, get_google_credentials() checks expires_at
   → If expired: refreshes via google.oauth2.credentials.Credentials.refresh()
   → Persists new access_token (re-encrypted) to DB
```

### OAuth Scopes

| Scope | Used By |
|---|---|
| `calendar` | Calendar tools (list, create, update, delete events) |
| `tasks` | Tasks tools (list, create, complete, delete) |
| `gmail.send` | Gmail tools (send, draft emails) |
| `gmail.readonly` | Gmail tools (list, read emails) |
| `contacts.readonly` | Contacts tool (search) |

Maps uses a global API key, not user OAuth.

## Agent Architecture

### LangGraph StateGraph

```
START ──→ agent ──→ [tools_condition] ──→ tools ──→ agent (loop)
                                      └──→ END
```

**State** (`AgentState`):
```python
class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    user_id: str
    tool_cards: Annotated[list[dict], operator.add]
```

- `messages` — auto-merged via LangGraph's `add_messages` reducer (deduplication by ID)
- `user_id` — injected per-request, used by tools to fetch OAuth credentials
- `tool_cards` — accumulated structured data from tool executions, appended via `operator.add`

**Agent node**: Calls `model_with_tools.invoke(state["messages"])` — Gemini 2.0 Flash with 15 tools bound.

**Tools node**: `ToolNode(tools)` dispatches to the appropriate `@tool` function.

**Loop**: When the LLM returns tool calls, the graph routes to the tools node, executes them, then loops back to the agent node. When the LLM returns a final text response (no tool calls), the graph routes to END.

### System Prompt

The system prompt defines Atlas's persona and enforces:
- Concise responses (under 3 sentences by default)
- Contact name resolution before sending emails
- **Destructive action confirmation** — must ask before deleting events/tasks or sending emails, must NOT call the tool on the same turn
- Natural tool chaining
- Error explanation with suggested fixes

### LLM

- **Provider**: Google Gemini via `langchain_google_genai`
- **Model**: `gemini-2.0-flash` (configurable via `LLM_MODEL`)
- **Auth**: API key (`GEMINI_API_KEY`)
- **Timeout**: 30 seconds

## Tool System

15 LangChain `@tool` functions across 5 Google service modules.

### Credential Resolution

Every Google API tool calls `get_google_credentials(user_id)` internally:

1. Queries `OAuthToken` table for the user's Google tokens
2. Decrypts access_token and refresh_token via Fernet
3. If token is expired and refresh_token exists: refreshes and persists new access_token
4. Returns `google.oauth2.credentials.Credentials`

The `user_id` is injected from LangGraph state via `Annotated[str, InjectedState("user_id")]`.

### Calendar Tools (`tools/calendar.py`)

| Tool | Description | Google API |
|---|---|---|
| `list_calendar_events` | Query events in a date range | `calendar.events().list()` |
| `create_calendar_event` | Create event with summary, time, attendees | `calendar.events().insert()` |
| `update_calendar_event` | Patch event fields by ID | `calendar.events().patch()` |
| `delete_calendar_event` | Remove event by ID | `calendar.events().delete()` |

### Gmail Tools (`tools/gmail.py`)

| Tool | Description | Google API |
|---|---|---|
| `send_email` | Send email to recipient | `gmail.messages().send()` |
| `draft_email` | Create draft email | `gmail.drafts().create()` |
| `list_emails` | Search/list emails by query | `gmail.messages().list()` + `.get()` |
| `read_email` | Read full email by message ID | `gmail.messages().get()` |

### Tasks Tools (`tools/tasks.py`)

| Tool | Description | Google API |
|---|---|---|
| `list_tasks` | List tasks from default tasklist | `tasks.tasks().list()` |
| `create_task` | Create task with title, notes, due date | `tasks.tasks().insert()` |
| `complete_task` | Mark task as completed | `tasks.tasks().patch()` |
| `delete_task` | Remove task by ID | `tasks.tasks().delete()` |

### Contacts Tool (`tools/contacts.py`)

| Tool | Description | Google API |
|---|---|---|
| `search_contacts` | Search contacts by name/query | `people.searchContacts()` |

Returns names, email addresses, and phone numbers.

### Maps Tools (`tools/maps.py`)

| Tool | Description | Google API |
|---|---|---|
| `distance_matrix` | Travel time/distance between locations | `GET /maps/api/distancematrix/json` |
| `get_directions` | Step-by-step directions | `GET /maps/api/directions/json` |

**Auth**: Global API key (`GOOGLE_MAPS_API_KEY`), not user OAuth. These are the only synchronous (non-async) tools.

### Tool Card System

Every tool returns a JSON string containing a `"card"` key with structured data:

```json
{
  "response": "Found 3 events",
  "card": {
    "type": "events_list",
    "events": [...]
  }
}
```

Cards are extracted by the Celery task, published to Redis Streams as `tool_result` events, and rendered by the frontend as rich UI components.

### Card Type Routing

| `card.type` | Frontend Component |
|---|---|
| `events_list`, `event_created`, `event_updated`, `event_deleted` | `CalendarEventCard` |
| `tasks_list`, `task_created`, `task_completed`, `task_deleted` | `TaskItemCard` |
| `emails_list`, `email_read`, `email_sent`, `email_drafted`, `contacts_list` | `EmailDraftCard` |
| `distance_matrix`, `route` | `RouteDistanceCard` |

## Real-Time Streaming

### Celery + Redis Streams

The WebSocket handler does not execute the agent directly. Instead:

```
1. Client sends message via WebSocket
2. WebSocket handler persists user message to DB
3. Handler enqueues Celery task (non-blocking):
   run_agent_task.apply_async(
       kwargs={task_id, session_id, message_history, user_id},
       queue="agent"
   )
4. Handler subscribes to Redis Stream: stream:{session_id}
5. Celery worker picks up task:
   a. Builds its own LangGraph instance (separate process)
   b. Converts messages to LangChain format with system prompt
   c. Runs graph.astream_events()
   d. Publishes events to Redis Stream via XADD:
      - status (Thinking...)
      - tool_start / tool_end
      - tool_result (structured cards)
      - done (final response)
      - error
6. WebSocket handler reads stream via XREAD
7. Forwards events to client as JSON WebSocket frames
8. On "done" or "error": handler stops listening
```

### Redis Stream Events

| Event Type | Payload | Description |
|---|---|---|
| `status` | `{type, message}` | Status updates (Thinking, Working on X) |
| `tool_start` | `{type, name}` | Tool execution started |
| `tool_end` | `{type, name}` | Tool execution completed |
| `tool_result` | `{type, card}` | Structured card data from tool |
| `done` | `{type, response}` | Final assistant response |
| `error` | `{type, message, task_id}` | Error occurred |

### WebSocket Protocol

**Client → Server** (JSON text frames):
```json
{"type": "text", "data": "user message"}
{"type": "audio", "data": "<base64-webm-audio>"}
```

**Server → Client** (JSON text frames):
```json
{"type": "status", "message": "Thinking..."}
{"type": "transcription", "text": "transcribed text"}
{"type": "tool_start", "name": "list_calendar_events"}
{"type": "tool_end", "name": "list_calendar_events"}
{"type": "tool_result", "card": {"type": "events_list", ...}}
{"type": "response", "text": "assistant reply"}
{"type": "hitl_request", "text": "Are you sure you want to delete...?"}
{"type": "tts_start"}
{"type": "tts_end"}
{"type": "error", "message": "..."}
```

**Server → Client** (binary frames between `tts_start`/`tts_end`):
WAV audio chunks from SarvamAI TTS.

### Connection Lifecycle

1. Client connects to `ws://host/api/v1/ws/{session_id}?token={jwt}`
2. Backend verifies JWT (close with code 4003 on failure)
3. Loads session + message history from DB into memory
4. Loads `UserSettings` for TTS/STT preferences
5. Main loop: receive → process → stream → persist
6. First user message auto-sets session title (truncated to 50 chars)

## Human-in-the-Loop (HITL)

Atlas uses an **LLM-based confirmation pattern** for destructive actions:

1. The system prompt instructs the LLM to ask for confirmation before destructive actions (delete events/tasks, send emails) and NOT to call the tool on the same turn
2. When the LLM's response matches a confirmation pattern (regex: "are you sure", "should I", "confirm?", etc.), the backend emits a `hitl_request` event instead of `response`
3. TTS is skipped for confirmation questions
4. Frontend shows a glass confirmation card with Confirm/Cancel buttons
5. User's response ("yes" / "no, cancel") is sent as a normal text message
6. The agent re-runs with the full conversation history including the confirmation
7. The LLM sees the user's response and either proceeds with the tool call or aborts

## Voice Pipeline

### Speech-to-Text (STT)

- **Provider**: SarvamAI API (`saaras:v3`)
- **Input**: base64-encoded WebM audio (from `MediaRecorder` with `audio/webm;codecs=opus`)
- **Language**: Configurable (auto-detect, English, Hindi, or 10 other Indian languages)
- **Execution**: Runs in thread executor (sync SDK call)

### Text-to-Speech (TTS)

- **Provider**: SarvamAI API (`bulbul:v3`)
- **Output**: 24kHz WAV audio chunks
- **Voices**: `shubh`, `kavya`, `priya`, `rahul`, `aditya`
- **Execution**: Runs in thread executor (sync SDK call)
- **Streaming**: Single WAV chunk yielded, sent as binary WebSocket frame
- **Skipped** for HITL confirmation questions

### Frontend Audio Playback

1. Binary WAV chunks arrive between `tts_start`/`tts_end` frames
2. `useTTS` hook accumulates chunks in an array
3. On `tts_end`: concatenates chunks, decodes via `AudioContext.decodeAudioData()`
4. Plays via WebAudio API (or falls back to `HTMLAudioElement`)
5. Audio unlock required on first user gesture (creates silent buffer)

## Frontend Architecture

### Routing

```
/                  → LandingPage (public)
/app               → Layout > ChatPage (new conversation)
/app/c/:sessionId  → Layout > ChatPage (existing conversation)
/app/settings      → Layout > SettingsPage
```

Auth gate: `AppRoutes` checks `useAuth()` — unauthenticated users see a login screen.

### State Management

No global state library. State is managed via:
- Custom hooks (`useAuth`, `useSessions`, `useSettings`, `useWebSocket`, `useTTS`, `useAudioRecorder`)
- `localStorage` for persistence (JWT, theme, settings)
- React `useState`/`useRef` for component-local state
- Custom DOM events (`session-created`) for cross-component signaling

### Design System

- **Base**: `#08080C` background, `#050508` outer margin
- **Ambient light**: Three asymmetric gradient blobs (cyan `#00F2FE`, cobalt `#2563EB`, amber `#FF7A00`) with 90-100px blur
- **Glass surfaces**: Solid `rgba(255,255,255,0.04)` + 1px `rgba(255,255,255,0.08)` border (no `backdrop-filter`)
- **Framed viewport**: `rounded-2xl` Layout wrapper with overflow hidden
- **Typography**: Instrument Serif for headings (`tracking-[-0.01em]`), Inter Variable + Geist Variable for body
- **Animations**: CSS `fade-in` (120ms) instead of Framer Motion for performance
- **Chat bubbles**: `max-w-[60%]`, side-based spacing (cross-side `mt-6`, same-side `mt-1`)
- **Tool cards**: `w-[28rem]` glass cards dispatched to specialized sub-components

## Infrastructure

### Docker Compose

| Service | Image | Ports | Notes |
|---|---|---|---|
| `postgres` | `postgres:16` | `5432:5432` | DB: `atlas_ai`, volume: `pgdata` |
| `redis` | `redis:7-alpine` | `6379:6379` | Celery broker + stream events |
| `backend` | `./backend` | `8000:8000` | FastAPI, env_file `.env` |
| `celery-worker` | `./backend` | — | `celery worker -Q agent -c 2` |

### Backend Dockerfile

- Base: `python:3.11-slim`
- Package manager: `uv` (Astral)
- Entry: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

### Celery Configuration

- Broker: Redis (DB 0)
- Result backend: Redis (DB 1)
- Serialization: JSON
- `task_acks_late=True` — acknowledge after completion
- `worker_prefetch_multiplier=1` — one task at a time per worker
- Hard timeout: 600s, soft timeout: 540s
- Queue routing: `app.tasks.agent.*` → `"agent"` queue

## Environment Variables

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/atlas_ai
REDIS_URL=redis://localhost:6379/0

GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
GOOGLE_MAPS_API_KEY=xxx

GEMINI_API_KEY=xxx
LLM_MODEL=gemini-2.0-flash

SARVAM_API_KEY=xxx
TTS_VOICE=shubh

FERNET_KEY=xxx
JWT_SECRET=xxx

VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Health check |
| GET | `/api/v1/auth/google/login` | No | Redirect to Google OAuth consent |
| GET | `/api/v1/auth/google/callback` | No | OAuth callback, store tokens, issue JWT |
| GET | `/api/v1/auth/me` | JWT | Current user profile |
| GET | `/api/v1/sessions` | JWT | List user's chat sessions |
| POST | `/api/v1/sessions` | JWT | Create new session |
| GET | `/api/v1/sessions/{id}` | JWT | Get session with messages |
| DELETE | `/api/v1/sessions/{id}` | JWT | Delete session + messages |
| GET | `/api/v1/user/settings` | JWT | Get TTS/STT preferences |
| PUT | `/api/v1/user/settings` | JWT | Update TTS/STT preferences |
| WS | `/api/v1/ws/{session_id}?token={jwt}` | JWT | Real-time agent interaction |

## Key Design Decisions

1. **Dual graph instances**: FastAPI compiles a LangGraph at startup (for `run_agent()`), but the Celery worker builds its own graph per task to avoid shared state across worker processes.

2. **Redis Streams over Pub/Sub**: `xadd`/`xread` provides durable event streaming — messages persist, late-joining consumers can replay, and the stream survives temporary disconnects.

3. **Fernet encryption at rest**: Google OAuth tokens are encrypted with AES-256 before storage in PostgreSQL. The encryption key is derived from `FERNET_KEY`.

4. **In-memory session history**: The WebSocket handler keeps message history in a Python dict, keyed by session_id. History is loaded from DB on connection and cleared on disconnect. This avoids Redis overhead for per-connection state.

5. **Tool cards as structured data**: Tools return both natural-language text AND a structured `"card"` object, allowing the frontend to render rich UI components (calendar events, task lists, email previews, route info) alongside the text response.

6. **LLM-based HITL**: Destructive action confirmation is handled via prompt engineering (the LLM asks before acting) rather than hardcoded `interrupt()` per tool. This is simpler and more flexible — the LLM decides what needs confirmation based on context.

7. **No backdrop-filter**: Glass surfaces use solid semi-transparent backgrounds instead of `backdrop-filter: blur()` for better rendering performance, especially on mobile.
