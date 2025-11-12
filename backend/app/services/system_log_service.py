import json
import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from .. import models
from ..logging import get_logger

logger = get_logger(__name__)

LEVEL_MAP = {
    "DEBUG": logging.DEBUG,
    "INFO": logging.INFO,
    "WARNING": logging.WARNING,
    "ERROR": logging.ERROR,
    "CRITICAL": logging.CRITICAL,
}


def record_system_log(
    db: Session,
    *,
    action: str,
    message: str,
    level: str = "INFO",
    user_id: Optional[int] = None,
    course_id: Optional[int] = None,
    assignment_id: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> models.SystemLog:
    log_entry = models.SystemLog(
        action=action,
        message=message,
        level=level.upper(),
        user_id=user_id,
        course_id=course_id,
        assignment_id=assignment_id,
        metadata_json=json.dumps(metadata, ensure_ascii=False) if metadata else None,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    logger.log(
        LEVEL_MAP.get(level.upper(), logging.INFO),
        message,
        extra={
            "action": action,
            "user_id": user_id,
            "course_id": course_id,
            "assignment_id": assignment_id,
        },
    )
    return log_entry
