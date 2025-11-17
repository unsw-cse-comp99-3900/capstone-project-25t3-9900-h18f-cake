import datetime
import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app import models
from app.db import get_db
from app.deps import UserClaims, get_current_user
from app.services.system_log_service import record_system_log

router = APIRouter(prefix="/v1/marking_result", tags=["marking_result"])
logger = logging.getLogger(__name__)

# ---------- Utils ----------
_TERM_RX = re.compile(r"^\s*(\d{4})\s*(?:Term|T)?\s*([0-9]+)\s*$", re.IGNORECASE)
_REVIEW_DIFF_THRESHOLD = 0.2  # TODO: move to config if needed


def parse_term(term: str) -> Tuple[str, str]:
    m = _TERM_RX.match(term or "")
    if not m:
        raise ValueError(f"Unexpected term format: {term}")
    year, num = m.groups()
    return year.strip(), f"Term{num.strip()}"


def course_json_path_by_components(course_code: str, year: str, term_norm: str) -> Path:
    folder = Path("marking_result") / f"{year}_{term_norm}"
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"{course_code}.json"


def course_json_path_by_course(course: models.Course) -> Path:
    year, term_norm = parse_term(course.term or "")
    return course_json_path_by_components(course.code, year, term_norm)


def _now_utc_iso() -> str:
    # Use UTC with 'Z' to avoid timezone confusion on the frontend
    return datetime.datetime.utcnow().isoformat() + "Z"


def ensure_defaults(data: Dict[str, Any]) -> Dict[str, Any]:
    # Canonical keys
    data.setdefault("marking_results", [])
    data.setdefault("course", "")
    data.setdefault("name", "")
    data.setdefault("term", "")
    data.setdefault("created_at", _now_utc_iso())

    # Normalize legacy key ai_marking_finished -> ai_completed
    if "ai_completed" not in data:
        data["ai_completed"] = bool(data.get("ai_marking_finished", False))
    # Optionally drop legacy key to avoid future confusion
    if "ai_marking_finished" in data:
        del data["ai_marking_finished"]

    return data


def load_json(path: Path) -> Dict[str, Any]:
    """
    Load JSON file and normalize legacy keys.
    - If file doesn't exist, return a normalized skeleton.
    - If legacy 'ai_marking_finished' exists, map it to 'ai_completed'.
    """
    if not path.exists():
        return ensure_defaults(
            {
                "course": path.stem,
                "name": "",
                "term": "",
                "created_at": _now_utc_iso(),
                "marking_results": [],
                "ai_completed": False,
            }
        )
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return ensure_defaults(data)


def save_json_atomic(path: Path, data: Dict[str, Any]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    tmp.replace(path)


# ---------- Schemas ----------
class MarkingIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    zid: str
    student_name: Optional[str] = None
    assignment_id: Optional[int] = None
    assignment: Optional[str] = None
    ai_marking_detail: Optional[Dict[str, Any]] = None
    tutor_marking_detail: Optional[Dict[str, Any]] = None
    marked_by: Optional[str] = None
    ai_total: Optional[float] = None
    tutor_total: Optional[float] = None
    difference: Optional[float] = None
    third_person_review_mark: Optional[float] = None
    ai_feedback: Optional[str] = None
    tutor_feedback: Optional[str] = None
    needs_review: Optional[bool] = Field(default=None, alias="needsReview")
    review_status: Optional[str] = None
    review_mark: Optional[float] = None
    review_comments: Optional[str] = None


class MarkingOut(MarkingIn):
    created_at: str


class MarkingStatusUpdate(BaseModel):
    ai_completed: bool


# ---------- GET: through course_id to get JSON file content ----------
@router.get("/by_id/{course_id}")
def get_course_marking_result_by_id(
    course_id: int,
    db: Session = Depends(get_db),
    # me: UserClaims = Depends(get_current_user),  # Enable if you want auth here
):
    c = db.get(models.Course, course_id)
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    # if c.owner_id != int(me.sub):
    #     raise HTTPException(status_code=403, detail="Forbidden")

    try:
        json_path = course_json_path_by_course(c)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        data = load_json(json_path)
        data["course"] = c.code
        data["name"] = c.name or ""
        data["term"] = c.term or ""
        return data
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="JSON file corrupted")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")


# ---------- GET: use course_code + year + term to search ----------
@router.get("/by_code/{course_code}")
def get_course_marking_result_by_code(
    course_code: str,
    year: str = Query(..., description="e.g., 2029"),
    term: str = Query(..., description="e.g., 3 / T3 / Term3"),
    # me: UserClaims = Depends(get_current_user),  # Consider enabling auth if data is sensitive
):
    if term and not term.lower().startswith(("t", "term")):
        term = f"Term{term}"
    try:
        year_norm, term_norm = parse_term(f"{year} {term}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    folder = Path("marking_result") / f"{year_norm}_{term_norm}"
    if not folder.exists():
        raise HTTPException(status_code=404, detail=f"Folder {folder} not found")

    json_path = folder / f"{course_code}.json"
    if not json_path.exists():
        raise HTTPException(status_code=404, detail=f"File for {course_code} not found")

    try:
        data = load_json(json_path)
        data.setdefault("course", course_code)
        data.setdefault("term", f"{year_norm} {term_norm}")
        return data
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="JSON file corrupted")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")


@router.get("/{course_id}/status")
def get_marking_status(
    course_id: int,
    db: Session = Depends(get_db),
    me: UserClaims = Depends(get_current_user),
):
    course = db.get(models.Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.owner_id != int(me.sub):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        json_path = course_json_path_by_course(course)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    data = load_json(json_path)
    ai_completed = bool(data.get("ai_completed"))
    pending_assignments: List[Dict[str, Any]] = []
    stuck_assignments: List[Dict[str, Any]] = []
    results = data.get("marking_results") or []

    # Dynamic override: if any assignment job of this course is queued/running, treat as not completed
    try:
        # Local import to avoid circular import at module load time
        from app.utils.jobq import get_jobq

        st_map = get_jobq().list_status()
        pending = False
        now_ts = datetime.datetime.utcnow().timestamp()
        for aid, st in st_map.items():
            a = db.get(models.Assignment, int(aid))
            if not a or not getattr(a, "course_id", None):
                continue
            if a.course_id != course.id:
                continue
            state = str(getattr(st, "state", "")).lower()
            info = {
                "assignment_id": a.id,
                "assignment_title": a.title,
                "state": state,
                "progress": getattr(st, "progress", 0.0),
                "message": getattr(st, "message", ""),
                "updated_at": getattr(st, "updated_at", None),
            }
            info["marked_count"] = sum(
                1
                for r in results
                if isinstance(r, dict)
                and r.get("assignment_id") == a.id
                and (
                    r.get("ai_marking_detail") is not None
                    or r.get("ai_total") is not None
                )
            )
            total_students = (
                db.query(models.Submission)
                .filter(models.Submission.assignment_id == a.id)
                .count()
            )
            info["total_students"] = total_students
            info["pending_students"] = max(
                0, total_students - info["marked_count"]
            )
            if info["updated_at"] is not None:
                info["updated_ago"] = max(0, now_ts - float(info["updated_at"]))
            else:
                info["updated_ago"] = None

            if state not in {"queued", "running", "error"}:
                continue
            pending_assignments.append(info)
            if state in {"queued", "running"}:
                pending = True
                stuck_for = info["updated_ago"]
                if stuck_for is not None and stuck_for >= 60:
                    info["stuck"] = True
                    info["stuck_for"] = int(stuck_for)
                    stuck_assignments.append(info)
                else:
                    info["stuck"] = False
            elif state == "error":
                pending = True
                info["stuck"] = True
                stuck_assignments.append(info)
        if pending:
            ai_completed = False
    except Exception as exc:
        logger.warning(
            "Failed to inspect AI job queue for course %s: %s", course.id, exc
        )
        # Fall back to stored flag if dynamic status check fails
    else:
        for info in stuck_assignments:
            try:
                exists = (
                    db.query(models.SystemLog)
                    .filter(
                        models.SystemLog.assignment_id == info["assignment_id"],
                        models.SystemLog.action == "ai_marking.stuck",
                    )
                    .first()
                )
                if exists:
                    continue
                record_system_log(
                    db,
                    action="ai_marking.stuck",
                    message=(
                        f"AI marking appears stuck for assignment '{info.get('assignment_title') or info.get('assignment_id')}'."
                    ),
                    user_id=None,
                    course_id=course.id,
                    assignment_id=info.get("assignment_id"),
                    metadata={
                        "state": info.get("state"),
                        "progress": info.get("progress"),
                        "message": info.get("message"),
                        "updated_ago": info.get("updated_ago"),
                    },
                )
            except Exception:
                logger.warning(
                    "Failed to record stuck AI log for assignment %s",
                    info.get("assignment_id"),
                )

    return {
        "ai_completed": ai_completed,
        "pending_assignments": pending_assignments,
        "stuck_assignments": stuck_assignments,
    }


@router.put("/{course_id}/status")
def update_marking_status(
    course_id: int,
    payload: MarkingStatusUpdate,
    db: Session = Depends(get_db),
    me: UserClaims = Depends(get_current_user),
):
    course = db.get(models.Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.owner_id != int(me.sub):
        raise HTTPException(status_code=403, detail="Forbidden")
    try:
        json_path = course_json_path_by_course(course)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    data = load_json(json_path)
    data["course"] = course.code
    data["name"] = course.name or ""
    data["term"] = course.term or ""
    data["ai_completed"] = bool(payload.ai_completed)

    save_json_atomic(json_path, data)
    return {"ai_completed": data["ai_completed"]}


# ---------- POST: through course_id append/rewrite marks (use zid upsert) ----------
@router.post("/{course_id}/append", response_model=MarkingOut)
def append_marking_result(
    course_id: int,
    payload: MarkingIn,
    db: Session = Depends(get_db),
    me: UserClaims = Depends(get_current_user),
):
    c = db.get(models.Course, course_id)
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    try:
        json_path = course_json_path_by_course(c)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    data = load_json(json_path)
    data["course"] = c.code
    data["name"] = c.name or ""
    data["term"] = c.term or ""

    def to_float(value: Any) -> Optional[float]:
        try:
            return float(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    incoming = payload.dict(exclude_unset=True)
    # Avoid clobbering existing keys with explicit nulls from clients
    if "assignment_id" in incoming and incoming["assignment_id"] is None:
        incoming.pop("assignment_id")

    zid_raw = str(incoming.get("zid", "")).strip()
    zid_norm = zid_raw.lower()
    aid = incoming.get("assignment_id")
    ass = str(incoming.get("assignment", "")).strip()

    existing = None
    existing_idx = None
    for i, r in enumerate(data["marking_results"]):
        if not isinstance(r, dict):
            continue
        same_zid = str(r.get("zid", "")).strip().lower() == zid_norm
        same_aid = r.get("assignment_id") == aid
        if same_zid and same_aid:
            existing = r
            existing_idx = i
            break

    if existing is None and aid is not None:
        for i, r in enumerate(data["marking_results"]):
            if not isinstance(r, dict):
                continue
            same_zid = str(r.get("zid", "")).strip().lower() == zid_norm
            if same_zid and r.get("assignment_id") is None:
                existing = r
                existing_idx = i
                break

    # Fallback: if no assignment_id provided, try match by (zid, assignment)
    if existing is None and aid is None and ass:
        for i, r in enumerate(data["marking_results"]):
            if not isinstance(r, dict):
                continue
            same_zid = str(r.get("zid", "")).strip().lower() == zid_norm
            same_ass = str(r.get("assignment", "")).strip() == ass
            if same_zid and same_ass:
                existing = r
                existing_idx = i
                break

    previous_review_mark = (existing or {}).get("review_mark")
    previous_review_comments = (existing or {}).get("review_comments")

    record: Dict[str, Any] = dict(existing or {})
    record.update(incoming)

    record["zid"] = zid_raw or record.get("zid", "")
    if aid is not None:
        record["assignment_id"] = aid
    elif (existing or {}).get("assignment_id") is not None:
        record["assignment_id"] = (existing or {}).get("assignment_id")
    record.setdefault("assignment", "")
    record.setdefault("student_name", "")
    record.setdefault("marked_by", "")

    ai_value = to_float(record.get("ai_total"))
    tutor_value = to_float(record.get("tutor_total"))
    if ai_value is not None:
        record["ai_total"] = ai_value
    if tutor_value is not None:
        record["tutor_total"] = tutor_value

    if ai_value is not None and tutor_value is not None:
        difference = round(ai_value - tutor_value, 2)
        record["difference"] = difference
    else:
        difference = to_float(record.get("difference"))
    new_status = (
        record.get("review_status") or (existing or {}).get("review_status") or ""
    )
    record["review_status"] = new_status
    is_reviewed = str(new_status).lower() in {
        "reviewed",
        "completed",
        "resolved",
        "checked",
    }

    if is_reviewed:
        record["needs_review"] = False
    else:
        if difference is not None and tutor_value not in (None, 0):
            record["needs_review"] = (
                abs(difference) / abs(tutor_value) >= _REVIEW_DIFF_THRESHOLD
            )
        else:
            record["needs_review"] = bool(record.get("needs_review"))

    now = _now_utc_iso()
    record.setdefault("created_at", now)
    record["updated_at"] = now

    if existing_idx is not None:
        data["marking_results"][existing_idx] = record
    else:
        data["marking_results"].append(record)

    save_json_atomic(json_path, data)

    def _format_mark(value: Any) -> str:
        if value in (None, ""):
            return "-"
        try:
            num = float(value)
        except (TypeError, ValueError):
            return str(value)
        text = f"{num:.2f}".rstrip("0").rstrip(".")
        return text or "0"

    def _mark_for_compare(value: Any) -> Any:
        if value in (None, ""):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return value

    new_review_mark = record.get("review_mark")
    new_review_comments = record.get("review_comments") or ""
    prev_comments_str = (previous_review_comments or "").strip()
    new_comments_str = str(new_review_comments).strip()

    mark_changed = _mark_for_compare(previous_review_mark) != _mark_for_compare(
        new_review_mark
    )
    comments_changed = prev_comments_str != new_comments_str

    change_fragments: List[str] = []
    if mark_changed:
        if previous_review_mark in (None, "") and new_review_mark not in (None, ""):
            change_fragments.append(f"mark set to {_format_mark(new_review_mark)}")
        elif new_review_mark in (None, ""):
            change_fragments.append("mark cleared")
        else:
            change_fragments.append(
                f"mark {_format_mark(previous_review_mark)} -> {_format_mark(new_review_mark)}"
            )
    if comments_changed:
        if not prev_comments_str and new_comments_str:
            change_fragments.append("feedback added")
        elif prev_comments_str and not new_comments_str:
            change_fragments.append("feedback cleared")
        else:
            change_fragments.append("feedback updated")

    if not change_fragments:
        change_fragments.append("saved with no notable changes")

    change_summary = "; ".join(change_fragments)
    message = (
        f"Review updated for zid {record.get('zid') or 'unknown'} "
        f"(assignment: {record.get('assignment') or record.get('assignment_id') or 'unknown'}): "
        f"{change_summary}"
    )

    record_system_log(
        db,
        action="mark_review.success",
        message=message,
        user_id=int(me.sub) if me and me.sub else None,
        course_id=c.id,
        assignment_id=record.get("assignment_id"),
        metadata={
            "zid": record.get("zid"),
            "assignment": record.get("assignment"),
            "review_mark": record.get("review_mark"),
            "previous_review_mark": previous_review_mark,
            "review_comments": new_review_comments,
            "previous_review_comments": previous_review_comments,
            "needs_review": record.get("needs_review"),
            "changes": change_fragments,
        },
    )
    return MarkingOut(**record)
