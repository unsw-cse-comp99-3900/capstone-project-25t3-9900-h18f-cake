import json
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from .. import models
from ..db import get_db
from ..deps import UserClaims, get_current_user

router = APIRouter(prefix="/v1/system_logs", tags=["system_logs"])


class SystemLogCreate(BaseModel):
    action: str = Field(..., max_length=128)
    message: str = Field(..., max_length=2000)
    level: str = Field(
        default="INFO", pattern=r"^(?i)(debug|info|warning|error|critical)$"
    )
    course_id: Optional[int] = None
    assignment_id: Optional[int] = None
    metadata: Optional[dict[str, Any]] = None


class SystemLogOut(BaseModel):
    id: int
    created_at: datetime
    level: str
    action: str
    message: str
    user_id: Optional[int] = None
    course_id: Optional[int] = None
    assignment_id: Optional[int] = None
    metadata: Optional[dict[str, Any]] = None
    user_name: Optional[str] = None
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    assignment_title: Optional[str] = None


def _serialize(log: models.SystemLog) -> SystemLogOut:
    metadata = None
    if log.metadata_json:
        try:
            metadata = json.loads(log.metadata_json)
        except json.JSONDecodeError:
            metadata = {"raw": log.metadata_json}
    return SystemLogOut(
        id=log.id,
        created_at=log.created_at,
        level=log.level,
        action=log.action,
        message=log.message,
        user_id=log.user_id,
        course_id=log.course_id,
        assignment_id=log.assignment_id,
        metadata=metadata,
        user_name=getattr(log.user, "email", None),
        course_name=getattr(log.course, "name", None),
        course_code=getattr(log.course, "code", None),
        assignment_title=getattr(log.assignment, "title", None),
    )


@router.get("/", response_model=list[SystemLogOut])
def list_logs(
    db: Session = Depends(get_db),
    _: UserClaims = Depends(get_current_user),
    level: Optional[str] = Query(
        None, pattern=r"^(?i)(debug|info|warning|error|critical)$"
    ),
    action: Optional[str] = Query(None, max_length=128),
    user_id: Optional[int] = Query(None),
    course_id: Optional[int] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    query = (
        db.query(models.SystemLog)
        .options(
            joinedload(models.SystemLog.user),
            joinedload(models.SystemLog.course),
            joinedload(models.SystemLog.assignment),
        )
        .order_by(models.SystemLog.created_at.desc())
    )
    if level:
        query = query.filter(models.SystemLog.level == level.upper())
    if action:
        query = query.filter(models.SystemLog.action.ilike(f"%{action}%"))
    if user_id is not None:
        query = query.filter(models.SystemLog.user_id == user_id)
    if course_id is not None:
        query = query.filter(models.SystemLog.course_id == course_id)

    logs = query.offset(offset).limit(limit).all()
    return [_serialize(log) for log in logs]


@router.post("/", response_model=SystemLogOut, status_code=201)
def create_log(
    payload: SystemLogCreate,
    db: Session = Depends(get_db),
    user: UserClaims = Depends(get_current_user),
):
    log = models.SystemLog(
        action=payload.action,
        message=payload.message,
        level=payload.level.upper(),
        user_id=int(user.sub) if user and user.sub else None,
        course_id=payload.course_id,
        assignment_id=payload.assignment_id,
        metadata_json=json.dumps(payload.metadata, ensure_ascii=False)
        if payload.metadata
        else None,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return _serialize(log)
