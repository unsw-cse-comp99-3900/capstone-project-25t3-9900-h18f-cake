from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Any, Iterable, Optional

from sqlalchemy.orm import Session

from .. import models
from ..tutor_marking_extract import TutorMarkExtractor
from ..routers.marking_result_manage import (
    course_json_path_by_course,
    load_json,
    save_json_atomic,
    _now_utc_iso,
    _REVIEW_DIFF_THRESHOLD,
)
from ..services.system_log_service import record_system_log
from ..logging import get_logger

logger = get_logger(__name__)


def _to_float(value: Any) -> Optional[float]:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _format_score_text(score: Optional[float]) -> str:
    if score is None:
        return "score: N/A"
    value = float(score)
    if value.is_integer():
        return f"score: {int(value)}"
    return f"score: {round(value, 2)}"


def _pretty_label(raw: Any) -> str:
    if raw is None:
        return "component"
    label = str(raw).replace("_", " ").strip()
    while "  " in label:
        label = label.replace("  ", " ")
    return label or "component"


def _resolve_course(db: Session, submission: models.Submission) -> models.Course:
    course: Optional[models.Course] = None

    if submission.assignment_id:
        assignment = db.get(models.Assignment, submission.assignment_id)
        if assignment is not None:
            course = assignment.course

    if course is None:
        q = (
            db.query(models.Course)
            .filter(
                models.Course.code == submission.course,
                models.Course.term == (submission.term or ""),
            )
            .limit(1)
        )
        course = q.first()

    if course is None:
        raise ValueError(
            f"Course not found for submission {submission.id} ({submission.course}, {submission.term})"
        )
    return course


def _upsert_record(
    data: Dict[str, Any],
    zid: str,
    assignment_id: int | None,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    updated = False
    record: Optional[Dict[str, Any]] = None
    for idx, item in enumerate(data["marking_results"]):
        if not isinstance(item, dict):
            continue
        same_zid = (item.get("zid", "").lower() == zid.lower())
        same_aid = (item.get("assignment_id") == assignment_id)
        if same_zid and same_aid:
            record = dict(item)
            record.update(payload)
            data["marking_results"][idx] = record
            updated = True
            break

    if not updated:
        record = dict(payload)
        data["marking_results"].append(record)

    return record

def sync_tutor_mark_from_file(
    db: Session,
    submission: models.Submission,
    mark_path: Path | str,
) -> Dict[str, Any]:
    """
    Parse tutor scoring document and upsert into the course marking_result JSON.
    """
    mark_path = Path(mark_path)
    if not mark_path.exists():
        raise FileNotFoundError(f"Mark file not found: {mark_path}")
    logger.info(
        "tutor_mark_sync_start",
        extra={
            "submission_id": submission.id,
            "assignment_id": submission.assignment_id,
            "path": str(mark_path),
        },
    )

    extractor = TutorMarkExtractor()
    extracted = extractor.extract_marks(str(mark_path))

    course = _resolve_course(db, submission)
    json_path = course_json_path_by_course(course)

    data = load_json(json_path)
    data["course"] = course.code
    data["name"] = course.name or ""
    data["term"] = course.term or ""

    zid = (extracted.get("zid") or "").lower()
    assignment_id: int | None = submission.assignment_id
    existing: Optional[Dict[str, Any]] = None
    for item in data["marking_results"]:
        if not isinstance(item, dict):
            continue
        if item.get("zid", "").lower() == zid and item.get("assignment_id") == assignment_id:
            existing = item
            break

    ai_total = _to_float(existing.get("ai_total")) if existing else None
    tutor_total = _to_float(extracted.get("tutor_total"))

    difference: Optional[float] = None
    if ai_total is not None and tutor_total is not None:
        difference = round(ai_total - tutor_total, 2)

    # Respect already reviewed status to avoid re-flagging
    existing_status = (existing or {}).get("review_status") or ""
    status_lower = str(existing_status).lower()
    already_reviewed = status_lower in {"reviewed", "completed", "resolved", "checked"}

    if already_reviewed:
        needs_review = False
    else:
        if ai_total is not None and tutor_total is not None:
            denom = abs(tutor_total) if abs(tutor_total) > 1e-9 else 1.0
            needs_review = (abs(ai_total - tutor_total) / denom) >= _REVIEW_DIFF_THRESHOLD
        else:
            needs_review = bool((existing or {}).get("needs_review"))

    payload = {
        "zid": zid,
        "assignment_id": assignment_id, 
        "assignment": (existing or {}).get("assignment") or submission.assignment_name or "",
        "student_name": (existing or {}).get("student_name") or submission.student_id or "",
        "ai_marking_detail": (existing or {}).get("ai_marking_detail"),
        "ai_total": ai_total,
        "tutor_marking_detail": extracted.get("tutor_marking_detail"),
        "tutor_total": tutor_total,
        "marked_by": "tutor",
        "difference": difference,
        "needs_review": needs_review,
        "review_status": (existing or {}).get("review_status", "pending"),
        "review_comments": (existing or {}).get("review_comments", ""),
        "ai_feedback": (existing or {}).get("ai_feedback"),
        "tutor_feedback": (existing or {}).get("tutor_feedback"),
        "created_at": _now_utc_iso(),
    }

    record = _upsert_record(data, zid, assignment_id, payload)

    save_json_atomic(json_path, data)
    return record


def sync_ai_predictions_from_file(
    db: Session,
    assignment_id: int,
    prediction_path: Path | str,
) -> Dict[str, Any]:
    assignment = db.get(models.Assignment, assignment_id)
    if not assignment:
        raise ValueError(f"Assignment {assignment_id} not found")

    course = assignment.course

    prediction_path = Path(prediction_path)
    if not prediction_path.exists():
        raise FileNotFoundError(f"Prediction file not found: {prediction_path}")

    try:
        predictions: Iterable[Dict[str, Any]] = json.loads(
            prediction_path.read_text(encoding="utf-8")
        )
    except Exception as exc:
        raise ValueError(f"Failed to parse prediction JSON: {exc}") from exc
    json_path = course_json_path_by_course(course)
    data = load_json(json_path)
    data["course"] = course.code
    data["name"] = course.name or ""
    data["term"] = course.term or ""

    updated_records: list[Dict[str, Any]] = []
    logger.info(
        "ai_prediction_sync_start",
        extra={
            "assignment_id": assignment_id,
            "course_id": course.id,
            "path": str(prediction_path),
        },
    )
    for item in predictions:
        zid_raw = (item.get("student_id") or "").lower()
        zid = zid_raw.split("_")[0]
        if not zid:
            continue

        result = item.get("result") or {}
        ai_total = _to_float(result.get("total"))
        detail: Dict[str, Any] = {}
        feedback_parts: list[str] = []
        for key, val in result.items():
            if key.lower() == "total":
                continue
            if not isinstance(val, dict):
                continue
            score = _to_float(val.get("score"))
            detail[key] = {
                "score": score,
                "comment": val.get("comments"),
            }
            readable_label = _pretty_label(key)
            score_text = _format_score_text(score)
            comment = val.get("comments")
            line = f"{readable_label} ({score_text})"
            if comment:
                line = f"{line} - {comment}"
            feedback_parts.append(line)

        ai_feedback = f"{'\n'.join(feedback_parts)}\n" if feedback_parts else None
        existing: Optional[Dict[str, Any]] = None
        for r in data["marking_results"]:
            if not isinstance(r, dict):
                continue
            same_zid = (r.get("zid", "") or "").lower() == zid
            same_aid = r.get("assignment_id") == assignment_id
            if same_zid and same_aid:
                existing = r
                break

        tutor_total = _to_float((existing or {}).get("tutor_total"))
        difference: Optional[float] = None
        if ai_total is not None and tutor_total is not None:
            difference = round(ai_total - tutor_total, 2)
        existing_status = (existing or {}).get("review_status") or ""
        status_lower = str(existing_status).lower()
        already_reviewed = status_lower in {"reviewed", "completed", "resolved", "checked"}

        if already_reviewed:
            needs_review = False
            review_status = existing_status
        else:
            if difference is not None and tutor_total not in (None, 0):
                denom = abs(tutor_total) if abs(tutor_total) > 1e-9 else 1.0
                needs_review = (abs(difference) / denom) >= _REVIEW_DIFF_THRESHOLD
            else:
                needs_review = bool((existing or {}).get("needs_review"))
            review_status = existing_status or "pending"

        payload = {
            "zid": zid,
            "assignment_id": assignment_id,
            "assignment": (existing or {}).get("assignment") or assignment.title or "",
            "student_name": (existing or {}).get("student_name") or zid,
            "ai_marking_detail": detail or None,
            "ai_total": ai_total,
            "tutor_marking_detail": (existing or {}).get("tutor_marking_detail"),
            "tutor_total": tutor_total,
            "marked_by": (existing or {}).get("marked_by") or "ai",
            "difference": difference,
            "needs_review": needs_review,
            "review_status": review_status,
            "review_comments": (existing or {}).get("review_comments", ""),
            "ai_feedback": ai_feedback,
            "tutor_feedback": (existing or {}).get("tutor_feedback"),
            "created_at": _now_utc_iso(),
        }

        record = _upsert_record(data, zid, assignment_id, payload)
        updated_records.append(record)

    save_json_atomic(json_path, data)
    record_system_log(
        db,
        action="ai_marking.success",
        message=f"AI marking completed for assignment '{assignment.title}'",
        user_id=None,
        course_id=course.id,
        assignment_id=assignment_id,
        metadata={"count": len(updated_records)},
    )
    logger.info(
        "ai_prediction_sync_completed",
        extra={
            "assignment_id": assignment_id,
            "course_id": course.id,
            "count": len(updated_records),
        },
    )
    return {"updated": len(updated_records), "path": str(json_path)}
