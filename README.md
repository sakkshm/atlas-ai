# Atlas

Voice-enabled AI assistant that orchestrates actions across Google Workspace services. Speak or type a command and Atlas chains together actions across Calendar, Tasks, Gmail, Contacts, and Maps — streaming each step back in real time.

## Architecture

```
                      +--------------------------+
                      |    React / Vite Frontend |
                      |  Audio Recorder / WS /   |
                      |  Glass UI / Dark Theme   |
                      +------------+-------------+
                                   |
                    REST / OAuth   |  WebSocket Stream
                                  \|/
                      +--------------------------+
                      |     FastAPI Backend       |
                      |  OAuth2 / JWT / WS Route  |
                      +------+-----------+-------+
                             |           |
                  Read/Write |           | Enqueue / Pub-Sub
                  Tokens     v           v
              +----------+     +----------+
              | Postgres |     |  Redis   |
              | (tokens) |     | (broker) |
              +----------+     +----+-----+
                                     |
                                Worker pulls job
                                     v
                      +--------------------------+
                      |   Celery Worker           |
                      |   LangGraph Agent         |
                      |                           |
                      |   1. SarvamAI STT API     |
                      |   2. Gemini LLM Reasoning  |
                      |   3. Google API Tools     |
                      |   4. SarvamAI TTS API     |
                      +--------------------------+
```

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python 3.11+ |
| Agent | LangGraph (modular tool-calling) |
| Task Queue | Celery (Redis broker) |
| Streaming | WebSocket + Redis Pub/Sub |
| Database | PostgreSQL (async SQLAlchemy) |
| Auth | Google OAuth2, JWT sessions |
| Encryption | AES-256 (Fernet) |
| LLM | Gemini 2.0 Flash (free tier) |
| STT | SarvamAI API (bulbul:v3) |
| TTS | SarvamAI API (bulbul:v3) |
| Frontend | React, Vite, TypeScript, Tailwind |
| Typography | Instrument Serif, Inter Variable |
| Infra | Docker Compose |

## Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- Google Cloud Console project with OAuth2 credentials
- Gemini API key (free tier: [aistudio.google.com](https://aistudio.google.com/apikey))
- SarvamAI API key ([sarvam.ai](https://www.sarvam.ai/))

## Setup

### 1. Clone and configure

```bash
git clone https://github.com/your-username/atlas-ai.git
cd atlas-ai
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/atlas_ai

# Redis
REDIS_URL=redis://localhost:6379/0

# Google OAuth2 (from Google Cloud Console)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

# Google Maps API key
GOOGLE_MAPS_API_KEY=xxx

# Gemini (LLM)
GEMINI_API_KEY=xxx
LLM_MODEL=gemini-2.0-flash

# SarvamAI (STT + TTS)
SARVAM_API_KEY=xxx
TTS_VOICE=shubh    # shubh, kavya, priya, rahul, aditya

# Encryption key (generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
FERNET_KEY=xxx

# Frontend
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

### 2. Start infrastructure

```bash
docker compose up -d postgres redis
```

### 3. Start backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start FastAPI
uvicorn app.main:app --reload --port 8000

# Start Celery worker (in a separate terminal)
celery -A app.tasks.celery_app worker -l info
```

### 4. Start frontend

```bash
cd frontend
npm install
npm run dev
```

The app is now running at `http://localhost:5173`.

### Docker (all-in-one)

```bash
docker compose up --build
```

This starts PostgreSQL, Redis, the FastAPI backend, and the Celery worker. The frontend runs separately via `npm run dev` for development.

## Google OAuth2 Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or select existing).
3. Navigate to **APIs & Services > Credentials**.
4. Create an **OAuth 2.0 Client ID** (Web application).
5. Add `http://localhost:8000/api/v1/auth/google/callback` as an authorized redirect URI.
6. Enable the following APIs:
   - Google Calendar API
   - Google Tasks API
   - Gmail API
   - Google People API (Contacts)
   - Google Maps Platform (Distance Matrix, Directions)
7. Copy the Client ID and Client Secret into your `.env`.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/v1/auth/google/login` | Redirect to Google OAuth2 consent screen |
| GET | `/api/v1/auth/google/callback` | OAuth2 callback, stores encrypted tokens |
| GET | `/api/v1/user/me` | Current user profile + connected services |
| WS | `/api/v1/ws/{session_id}` | WebSocket for real-time agent interaction |

## How It Works

1. **Authenticate** — User logs in via Google OAuth2. Access and refresh tokens are encrypted with AES-256 and stored in PostgreSQL.
2. **Send Command** — User speaks (push-to-talk) or types a command in the UI.
3. **Process** — The command is sent over WebSocket to FastAPI, which enqueues a Celery task. The LangGraph agent:
   - Transcribes audio via SarvamAI STT API
   - Reasons over the user's intent with Gemini 2.0 Flash
   - Resolves entities (e.g., "John" → Contacts API → email address)
   - Executes Google API tools (Calendar, Tasks, Gmail, Maps)
   - For destructive actions (delete, send email), asks for confirmation before proceeding (HITL)
4. **Stream** — Each step is published to Redis Pub/Sub and streamed back to the frontend in real time.
5. **Respond** — The final answer is rendered as text + structured action cards and read aloud via SarvamAI TTS (streamed as audio over WebSocket).

## Project Structure

```
atlas-ai/
├── docker-compose.yml
├── .env.example
├── backend/
│   └── app/
│       ├── main.py              # FastAPI app factory
│       ├── core/                # Config, security, database
│       ├── models/              # SQLAlchemy models (User, OAuthToken)
│       ├── api/v1/              # REST + WebSocket routes
│       ├── agent/               # LangGraph graph, state, prompts
│       │   └── tools/           # Google API tool modules
│       └── tasks/               # Celery config + background tasks
└── frontend/
    └── src/
        ├── components/
        │   ├── cards/           # Individual action cards
        │   ├── layout/          # Sidebar, header, ambient blobs
        │   └── ui/              # Shared UI primitives
        ├── hooks/               # Audio, WebSocket, TTS hooks
        ├── pages/               # Landing, Chat, Settings
        └── lib/                 # API client, utilities
```

## License

MIT
