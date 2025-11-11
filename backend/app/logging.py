import json
import logging
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Any, Optional

_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
_configured = False


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log: dict[str, Any] = {
            "timestamp": datetime.now().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": _request_id_ctx.get("-"),
        }
        if hasattr(record, "action"):
            log["action"] = getattr(record, "action")
        if hasattr(record, "user_id"):
            log["user_id"] = getattr(record, "user_id")
        if hasattr(record, "course_id"):
            log["course_id"] = getattr(record, "course_id")
        if hasattr(record, "assignment_id"):
            log["assignment_id"] = getattr(record, "assignment_id")
        if getattr(record, "extra", None):
            log["extra"] = record.extra
        if record.exc_info:
            log["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(log, ensure_ascii=False)


def configure_logging(level: int = logging.INFO) -> None:
    global _configured
    if _configured:
        return
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.setLevel(level)
    root.addHandler(handler)
    _configured = True


def get_logger(name: Optional[str] = None) -> logging.Logger:
    configure_logging()
    return logging.getLogger(name or "app")


def bind_request_id(request_id: str):
    return _request_id_ctx.set(request_id)


def release_request_id(token):
    try:
        _request_id_ctx.reset(token)
    except LookupError:
        pass


def current_request_id() -> str:
    return _request_id_ctx.get("-")
