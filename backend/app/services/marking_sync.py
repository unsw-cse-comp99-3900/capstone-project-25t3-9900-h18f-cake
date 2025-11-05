from __future__ import annotations

from pathlib import Path
from typing import Dict, Any, Optional

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


def _to_float(value: Any) -> Optional[float]:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None


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

    extractor = TutorMarkExtractor()
    extracted = extractor.extract_marks(str(mark_path))

    course = _resolve_course(db, submission)
    json_path = course_json_path_by_course(course)

    data = load_json(json_path)
    data["course"] = course.code
    data["name"] = course.name or ""
    data["term"] = course.term or ""

    zid = (extracted.get("zid") or "").lower()
    existing: Optional[Dict[str, Any]] = None
    for item in data["marking_results"]:
        if isinstance(item, dict) and item.get("zid", "").lower() == zid:
            existing = item
            break

    ai_total = _to_float(existing.get("ai_total")) if existing else None
    tutor_total = _to_float(extracted.get("tutor_total"))

    difference: Optional[float] = None
    if ai_total is not None and tutor_total is not None:
        difference = round(ai_total - tutor_total, 2)

    needs_review = (
        abs(difference) >= _REVIEW_DIFF_THRESHOLD if difference is not None else bool(existing and existing.get("needs_review"))
    )

    record = dict(existing) if isinstance(existing, dict) else {}
    record.update(
        {
            "zid": zid,
            "assignment": record.get("assignment") or submission.assignment_name or "",
            "student_name": record.get("student_name") or submission.student_id or "",
            "ai_marking_detail": record.get("ai_marking_detail"),
            "ai_total": ai_total,
            "tutor_marking_detail": extracted.get("tutor_marking_detail"),
            "tutor_total": tutor_total,
            "marked_by": "tutor",
            "difference": difference,
            "needs_review": needs_review,
            "review_status": record.get("review_status", "pending"),
            "review_comments": record.get("review_comments", ""),
            "ai_feedback": record.get("ai_feedback"),
            "tutor_feedback": record.get("tutor_feedback"),
            "created_at": _now_utc_iso(),
        }
    )

    # Upsert by zid
    updated = False
    for idx, item in enumerate(data["marking_results"]):
        if isinstance(item, dict) and item.get("zid", "").lower() == zid:
            data["marking_results"][idx] = record
            updated = True
            break

    if not updated:
        data["marking_results"].append(record)

    save_json_atomic(json_path, data)
    return record
