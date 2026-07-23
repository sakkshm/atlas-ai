import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.auth import router as auth_router
from app.api.v1.sessions import router as sessions_router
from app.api.v1.user_settings import router as user_settings_router
from app.api.v1.websocket import router as ws_router
from app.core.config import settings
from app.core.ratelimit import RateLimitMiddleware

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from alembic.config import Config
    from alembic import command

    alembic_cfg = Config("/app/alembic.ini")
    await asyncio.to_thread(command.upgrade, alembic_cfg, "head")

    from app.agent.graph import init_graph

    await init_graph()
    yield
    from app.core.database import engine

    await engine.dispose()


app = FastAPI(title="Atlas", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.VITE_API_URL, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RateLimitMiddleware, max_requests=60, window_seconds=60)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
            "status_code": exc.status_code,
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
        },
    )


app.include_router(auth_router, prefix="/api/v1")
app.include_router(sessions_router, prefix="/api/v1")
app.include_router(user_settings_router, prefix="/api/v1")
app.include_router(ws_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
