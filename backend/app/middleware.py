import time
from typing import Callable
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from .logging import bind_request_id, get_logger, release_request_id

request_logger = get_logger("app.request")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        request_id = request.headers.get("x-request-id") or str(uuid4())
        token = bind_request_id(request_id)
        request.state.request_id = request_id
        start = time.perf_counter()
        try:
            response: Response = await call_next(request)
            duration_ms = (time.perf_counter() - start) * 1000
            request_logger.info(
                "request_completed",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": round(duration_ms, 2),
                    "client": request.client.host if request.client else None,
                },
            )
            response.headers["x-request-id"] = request_id
            return response
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            request_logger.exception(
                "request_failed",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "duration_ms": round(duration_ms, 2),
                },
            )
            raise
        finally:
            release_request_id(token)
