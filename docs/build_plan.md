# Atlas AI — Build Plan

## Project Summary

A voice-enabled AI assistant that orchestrates actions across 5 Google services (Calendar, Tasks, Gmail, Contacts, Maps) using LangGraph, with real-time streaming via WebSocket + Redis Pub/Sub, and a polished React frontend with a "Living Aura" voice visualizer.

## Deliverables Required

1. Source code repository (clean, structured)
2. README.md with setup instructions + architecture diagrams
3. Live deployment (hosted URL)
4. Demo video (5-10 min)

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + Python 3.11+ |
| Agent Orchestration | LangGraph (modular tool-calling architecture) |
| Task Queue | Celery (Redis broker) |
| Real-time Streaming | WebSocket + Redis Pub/Sub |
| Database | PostgreSQL (async SQLAlchemy) |
| Auth | Google OAuth2 + JWT sessions |
| Token Encryption | AES-256 (Fernet) |
| LLM | Gemini 2.0 Flash (free tier) |
| STT | faster-whisper (local, free, offline) |
| TTS | edge-tts (free, no API key) |
| Frontend | React + Vite + TypeScript + Tailwind + Shadcn UI |
| Animations | Framer Motion + Web Audio API |
| Infrastructure | Docker Compose |

---

## Resolved Design Decisions

| Original Plan Issue | Resolution |
|---|---|
| Google Maps described as OAuth-based | Maps uses **server-side API key** (not user OAuth). Separate config var. |
| Two conflicting frontend folder structures | Merged into single structure with `aura/`, `cards/`, `chat/`, `layout/` subdirs |
| `audio_bytes` in AgentState | Use **base64 string** (`audio_b64`) — Celery serializes via JSON, not raw bytes |
| WebSocket auth undefined | JWT validated once on WS connect via query param or first frame |
| No `.env.example` | Added to plan |
| Docker services undefined | Explicit: postgres, redis, backend, celery-worker |
| No error handling strategy | LangGraph error node + retry-once per tool + UI error states |
| No LangGraph persistence | Use `PostgresSaver` checkpointing for conversation state |
| Destructive action safety | HITL confirmation step in LangGraph graph for delete/update operations |
| OpenAI dependency removed | STT uses `faster-whisper` (local), LLM uses Gemini, TTS uses `edge-tts` — no OpenAI API key needed |

---

## Repository Structure

```
atlas-ai/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── README.md
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── database.py
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   └── oauth.py
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── auth.py
│   │   │       ├── websocket.py
│   │   │       └── user.py
│   │   ├── agent/
│   │   │   ├── __init__.py
│   │   │   ├── graph.py
│   │   │   ├── state.py
│   │   │   ├── prompts.py
│   │   │   ├── stt.py              # faster-whisper wrapper
│   │   │   ├── llm.py              # Gemini wrapper
│   │   │   ├── tts.py              # edge-tts wrapper
│   │   │   └── tools/
│   │   │       ├── __init__.py
│   │   │       ├── calendar_tool.py
│   │   │       ├── tasks_tool.py
│   │   │       ├── gmail_tool.py
│   │   │       ├── contacts_tool.py
│   │   │       └── maps_tool.py
│   │   └── tasks/
│   │       ├── __init__.py
│   │       ├── celery_app.py
│   │       └── agent_tasks.py
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   └── Dockerfile
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── aura/
    │   │   │   ├── DynamicAura.tsx
    │   │   │   └── AudioWaveform.tsx
    │   │   ├── cards/
    │   │   │   ├── CalendarEventCard.tsx
    │   │   │   ├── TaskItemCard.tsx
    │   │   │   ├── EmailDraftCard.tsx
    │   │   │   └── RouteDistanceCard.tsx
    │   │   ├── chat/
    │   │   │   ├── ChatMessage.tsx
    │   │   │   ├── StreamingStatus.tsx
    │   │   │   └── VoiceBar.tsx
    │   │   └── layout/
    │   │       ├── Sidebar.tsx
    │   │       └── Header.tsx
    │   ├── hooks/
    │   │   ├── useAudioRecorder.ts
    │   │   ├── useAudioAnalyser.ts
    │   │   ├── useWebSocket.ts
    │   │   └── useTTS.ts
    │   └── lib/
    │       ├── api.ts
    │       └── utils.ts
    └── Dockerfile
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/atlas_ai

# Redis
REDIS_URL=redis://localhost:6379/0

# Google OAuth2
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

# Google Maps (API key, not OAuth)
GOOGLE_MAPS_API_KEY=xxx

# Gemini (LLM)
GEMINI_API_KEY=xxx
LLM_MODEL=gemini-2.0-flash

# Whisper STT (local, no API key)
WHISPER_MODEL_SIZE=base    # tiny, base, small, medium

# Edge TTS (free, no API key)
TTS_VOICE=en-US-AriaNeural

# Encryption
FERNET_KEY=xxx

# Frontend
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## Docker Compose

```yaml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: atlas_ai
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [postgres, redis]
    volumes: ["./backend:/app"]

  celery-worker:
    build: ./backend
    command: celery -A app.tasks.celery_app worker -l info
    env_file: .env
    depends_on: [postgres, redis]
    volumes: ["./backend:/app"]
```

---

## Execution Phases

### Phase 1: Infrastructure & Scaffolding (~2-3h)

- `git init`, `.gitignore`
- Create `.env.example` with all required variables
- `docker-compose.yml`: postgres (16) + redis (7-alpine)
- Backend scaffold:
  - `backend/app/main.py` — FastAPI app factory with lifespan, CORS
  - `backend/app/core/config.py` — Pydantic v2 `BaseSettings` loading all env vars
  - `backend/app/core/database.py` — async SQLAlchemy engine + `AsyncSession` factory
  - `backend/Dockerfile` — Python 3.11-slim, install deps, run uvicorn
  - `backend/requirements.txt`
- Frontend scaffold:
  - `npm create vite@latest` with React + TypeScript
  - Install Tailwind CSS + Shadcn UI
  - `vite.config.ts` — proxy `/api` and `/ws` to `localhost:8000` for dev
  - `postcss.config.js`, `tsconfig.json`
  - `frontend/Dockerfile` — node:18-slim, install deps, run dev server
- Verify both servers start and talk to each other

### Phase 2: Authentication & Token Encryption (~3-4h)

- SQLAlchemy models:
  - `User` — id, email, name, avatar_url, created_at
  - `OAuthToken` — id, user_id (FK), provider, access_token (encrypted), refresh_token (encrypted), scopes, expires_at, created_at
- `core/security.py`:
  - `encrypt_token(plaintext: str) -> str` using Fernet AES-256
  - `decrypt_token(ciphertext: str) -> str`
  - `create_session_token(user_id: str) -> str` (JWT with python-jose)
  - `verify_session_token(token: str) -> dict`
- `api/v1/auth.py`:
  - `GET /api/v1/auth/google/login` — redirect to Google consent screen with scopes: `calendar`, `tasks`, `gmail.send`, `gmail.readonly`, `https://www.googleapis.com/auth/contacts.readonly`, `openid`, `email`, `profile`
  - `GET /api/v1/auth/google/callback` — exchange code for tokens, encrypt + store in DB, create JWT session, redirect to frontend
- Token auto-refresh: before each Google API call, check `expires_at`, refresh if expired using `google.oauth2.credentials.Credentials`
- Alembic setup:
  - `alembic init` in `backend/`
  - `alembic revision --autogenerate` for initial migration
  - `alembic upgrade head` in startup or Docker entrypoint

### Phase 2.5: Voice Loop — Walking Skeleton (~3-4h)

> **Goal: Speak into mic, hear Gemini respond aloud. No Google tools yet. Just a working voice chat.**

**Backend — 3 modules:**

- `agent/stt.py`:
  ```python
  from faster_whisper import WhisperModel
  model = WhisperModel(settings.WHISPER_MODEL_SIZE, device="cpu")
  
  async def transcribe(audio_b64: str) -> str:
      audio_bytes = base64.b64decode(audio_b64)
      segments, _ = model.transcribe(BytesIO(audio_bytes))
      return " ".join(seg.text for seg in segments)
  ```
  - Downloads model on first call (~150MB for `base`)
  - Accepts base64 audio (webm/opus from MediaRecorder)

- `agent/llm.py`:
  ```python
  from langchain_google_genai import ChatGoogleGenerativeAI
  
  llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=settings.GEMINI_API_KEY)
  
  async def chat(messages: list[dict]) -> str:
      response = await llm.ainvoke(messages)
      return response.content
  ```
  - Simple chat, no tools bound yet
  - Takes message history, returns text

- `agent/tts.py`:
  ```python
  import edge_tts
  
  async def synthesize(text: str, voice: str) -> AsyncGenerator[bytes, None]:
      communicate = edge_tts.Communicate(text, voice)
      async for chunk in communicate.stream():
          if chunk["type"] == "audio" and chunk["data"]:
              yield chunk["data"]
  ```
  - Async generator yielding MP3 chunks

- `api/v1/websocket.py`:
  - `WS /api/v1/ws/{session_id}`
  - Protocol (JSON text frames + binary audio frames):
    ```
    Client → Server: {"type": "audio", "data": "<base64_audio>"}
    Client → Server: {"type": "text", "data": "hello"}
    
    Server → Client: {"type": "status", "message": "Transcribing..."}
    Server → Client: {"type": "status", "message": "Thinking..."}
    Server → Client: {"type": "tts_start"}
    Server → Client: <binary MP3 chunk>
    Server → Client: <binary MP3 chunk>
    Server → Client: {"type": "tts_end"}
    Server → Client: {"type": "response", "text": "Hello! How can I help?"}
    ```
  - **Synchronous flow in this phase** — no Celery yet. STT → LLM → TTS runs inline in the WS handler.

**Frontend — minimal:**

- `useAudioRecorder.ts` — MediaRecorder API, push-to-talk, exports base64 webm
- `useWebSocket.ts` — connects to WS, handles JSON + binary frames
- `useTTS.ts` — collects MP3 binary chunks, creates Blob, plays via `<audio>` element or AudioContext
- Minimal UI: push-to-talk button + text bubble display + audio playback indicator
- No sidebar, no cards, no aura yet — just a working voice loop

**Verify end-to-end:**
1. Click mic, say "What time is it?"
2. See "Transcribing..." status
3. See transcribed text appear
4. See "Thinking..." status
5. Hear Gemini's response spoken aloud
6. See response text displayed

### Phase 3: Google API Tool Suite (~4-5h)

- 5 tool modules, each as a callable function returning structured JSON:

- `tools/calendar_tool.py`:
  - `list_events(start: str, end: str) -> list[dict]` — query events in date range
  - `create_event(summary: str, start: str, end: str, attendees: list[str], description: str) -> dict`
  - `update_event(event_id: str, **fields) -> dict`
  - `delete_event(event_id: str) -> bool`
  - Uses `googleapiclient.discovery.build("calendar", "v3", credentials=creds)`

- `tools/tasks_tool.py`:
  - `list_tasks(tasklist: str = "@default") -> list[dict]`
  - `create_task(title: str, notes: str, due: str) -> dict`
  - `complete_task(task_id: str) -> dict`
  - `delete_task(task_id: str) -> bool`

- `tools/gmail_tool.py`:
  - `draft_email(to: str, subject: str, body: str) -> dict`
  - `send_email(to: str, subject: str, body: str) -> dict`
  - Uses `gmail.users().drafts()` and `gmail.users().messages()`

- `tools/contacts_tool.py`:
  - `search_contacts(query: str) -> list[dict]` — search by name, return email/phone
  - Uses People API: `people.people.connections.list("people/me", personFields="names,emailAddresses,phoneNumbers")`

- `tools/maps_tool.py`:
  - `distance_matrix(origins: str, destinations: str, mode: str = "driving") -> dict`
  - `get_directions(origin: str, destination: str, mode: str = "driving") -> dict`
  - Uses API key auth (not OAuth): `requests.get("https://maps.googleapis.com/maps/api/distancematrix/json", params=...)`

- Each tool: accepts user credentials (or API key) + params → returns structured dict
- Unit tests per tool with mock credentials/responses

### Phase 4: LangGraph Agent with Tools (~4-5h)

- `agent/state.py`:
  ```python
  class AgentState(TypedDict):
      messages: list[BaseMessage]
      user_id: str
      audio_b64: str | None
      tool_logs: list[str]
      final_response: str
      pending_confirmation: dict | None  # for HITL
  ```

- `agent/prompts.py`:
  - System prompt defining Atlas AI persona
  - Tool descriptions in natural language
  - Rules: ask for clarification on ambiguous inputs, confirm before destructive actions, always resolve contact names before emailing

- `agent/graph.py` — LangGraph `StateGraph`:
  ```
  START → speech_to_text (conditional: skip if text input)
        → reasoning_agent (Gemini + bound tools)
        → tool_executor (ToolNode)
        → HITL check (conditional: pause if pending_confirmation)
        → generate_final_response
        → END
  ```
  - Tool binding: use `llm.bind_tools([calendar_tool, tasks_tool, ...])` — Gemini supports function calling
  - `tool_executor` node uses LangGraph's `ToolNode` to dispatch calls
  - Error handling: wrap each tool call in try/except, log failures to `tool_logs`, retry once on transient errors
  - `PostgresSaver` for checkpointing conversation state

### Phase 5: Celery + Redis Pub/Sub (~3-4h)

- `tasks/celery_app.py`:
  ```python
  celery = Celery("atlas", broker=settings.REDIS_URL)
  ```
- `tasks/agent_tasks.py`:
  ```python
  @celery.task
  def execute_agent_graph(session_id: str, user_id: str, payload: dict):
      # Run LangGraph graph, publish steps to Redis Pub/Sub
  ```
- Redis Pub/Sub channel: `agent:{session_id}`
  - Step updates published as: `{"type": "status", "message": "Checking Calendar..."}`
  - Final response: `{"type": "response", "text": "..."}`
  - TTS audio chunks: `{"type": "tts_chunk"}` + binary data via separate mechanism

- Refactor WebSocket endpoint:
  1. Receive audio/text from client
  2. Enqueue Celery task (returns task_id)
  3. Subscribe to Redis channel `agent:{session_id}`
  4. Stream events from Redis back to client as they arrive
  5. TTS: after final text response, stream edge-tts MP3 chunks over WS

- Add Celery + celery-redis to `requirements.txt`

### Phase 6: Frontend Core UI (~5-6h)

- Layout:
  - `layout/Sidebar.tsx` — Google account connection status cards, logout button
  - `layout/Header.tsx` — app title, minimal controls
  - Main chat area with message list + input bar

- `chat/VoiceBar.tsx` — floating bottom bar with push-to-talk button, text input fallback, send button
- `chat/ChatMessage.tsx` — renders user messages (text) and assistant messages (text + action cards)
- `chat/StreamingStatus.tsx` — collapsible live reasoning log showing tool execution steps

- Action cards (Shadcn UI components):
  - `cards/CalendarEventCard.tsx` — event name, date/time, attendees, "Open in Google Calendar" link
  - `cards/TaskItemCard.tsx` — task title, due date, priority badge, checkbox
  - `cards/EmailDraftCard.tsx` — recipient, subject, body preview, "Send" / "Discard" buttons
  - `cards/RouteDistanceCard.tsx` — distance, duration, route summary

- `hooks/useWebSocket.ts` — connect, auto-reconnect on disconnect, parse JSON events, handle binary audio
- `hooks/useAudioRecorder.ts` — MediaRecorder, push-to-talk state, base64 export
- `hooks/useTTS.ts` — collect MP3 chunks from WS binary frames, play via `<audio>` element
- `lib/api.ts` — Axios instance for REST calls (OAuth redirect, user profile)

### Phase 7: Frontend Visual System (~4-5h)

- Theme:
  - Dark mode base: `#09090B` background, `zinc-900` cards
  - Glassmorphism: `backdrop-blur-md`, `bg-white/5`, `border-white/10`
  - Neon accents: `cyan-500` (active), `violet-500` (thinking), `emerald-500` (success)
  - Typography: Inter / Geist Sans, `text-zinc-400` for secondary labels

- `aura/DynamicAura.tsx`:
  - Canvas or SVG orb centered in voice bar
  - 4 states with smooth Framer Motion transitions:
    - **Idle**: soft breathing pulse (violet/indigo glow)
    - **Listening**: audio-reactive wave expansion via Web Audio API `AnalyserNode`
    - **Thinking**: spinning gradient morph with particle trails
    - **Speaking**: dynamic pulsing bars synced with TTS output

- `aura/AudioWaveform.tsx` — real-time frequency visualization bars
- `hooks/useAudioAnalyser.ts` — Web Audio API `AnalyserNode`, returns frequency data array

- Framer Motion:
  - `AnimatePresence` for message mount/unmount
  - `layout` animations for card morphing
  - Spring physics on aura state transitions

- Micro-animations on action cards: hover lift, success checkmark animation, loading skeleton

### Phase 8: Integration, Testing & Polish (~3-4h)

- E2E workflow tests:
  - "Schedule a meeting with John tomorrow at 3 PM and email him" → contacts resolve → calendar create → gmail draft
  - "What's my day look like tomorrow?" → calendar + tasks query → synthesized brief
  - "Delete my meeting with Sarah" → ambiguity detection → HITL prompt → confirm → delete
  - Voice input flow: audio → STT → LLM → TTS → playback

- Edge cases:
  - Expired OAuth token → auto-refresh → retry
  - Contact not found → graceful error message
  - Ambiguous contact name → ask for clarification
  - Invalid time slot → suggest alternatives
  - WebSocket disconnect → auto-reconnect + resume

- Error states in UI:
  - Auth expired banner with "Reconnect" button
  - Tool failure toast notifications
  - Connection lost overlay

- Finalize `README.md` — complete setup, architecture diagram, env var table
- Docker Compose verification — `docker compose up --build` starts everything
- `.env.example` final check — all vars documented

**Total estimated time: ~31-39 hours of focused work**

---

## Key Use Cases

### 1. Smart Meeting Scheduling & Notification

> "Schedule a sync meeting with John tomorrow at 3 PM about the project launch and send him an email letting him know."

Flow: Contacts → resolve "John" → Calendar check conflicts → create event → Gmail draft/send → confirm to user

### 2. Travel-Aware Calendar & Task Planning

> "I have a dentist appointment at 4 PM in Downtown. How long will it take to get there from my current office, and add a task to leave on time?"

Flow: Maps transit time → calculate departure → Tasks create reminder

### 3. Task & Schedule Synthesis

> "What does my day look like tomorrow, and what tasks are due?"

Flow: Calendar fetch events → Tasks fetch pending → synthesize daily brief

### 4. Ambiguity Handling & Safety

> "Delete my meeting with Sarah."

Flow: Calendar finds 2 matches → HITL clarification prompt → user selects → execute
