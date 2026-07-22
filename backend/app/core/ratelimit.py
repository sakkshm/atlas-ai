import time
from collections import defaultdict, deque
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 60, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: dict[str, deque[float]] = defaultdict(deque)

    def _client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _is_rate_limited(self, key: str) -> tuple[bool, int]:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        timestamps = self._requests[key]

        while timestamps and timestamps[0] < cutoff:
            timestamps.popleft()

        if len(timestamps) >= self.max_requests:
            oldest = timestamps[0]
            retry_after = int(self.window_seconds - (now - oldest)) + 1
            return True, retry_after

        timestamps.append(now)
        return False, 0

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint):
        if request.url.path.startswith("/health"):
            return await call_next(request)

        key = f"rest:{self._client_ip(request)}"
        limited, retry_after = self._is_rate_limited(key)

        if limited:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "rate_limited",
                    "message": "Too many requests. Please slow down.",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        return await call_next(request)


class WSRateLimiter:
    def __init__(self, max_messages: int = 20, window_seconds: int = 60):
        self.max_messages = max_messages
        self.window_seconds = window_seconds
        self._sessions: dict[str, deque[float]] = defaultdict(deque)

    def check(self, session_id: str) -> tuple[bool, int]:
        now = time.monotonic()
        cutoff = now - self.window_seconds
        timestamps = self._sessions[session_id]

        while timestamps and timestamps[0] < cutoff:
            timestamps.popleft()

        if len(timestamps) >= self.max_messages:
            oldest = timestamps[0]
            retry_after = int(self.window_seconds - (now - oldest)) + 1
            return True, retry_after

        timestamps.append(now)
        return False, 0

    def cleanup(self, session_id: str):
        self._sessions.pop(session_id, None)


ws_rate_limiter = WSRateLimiter()
