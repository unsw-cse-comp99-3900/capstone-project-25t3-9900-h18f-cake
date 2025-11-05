from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pathlib import Path
from pydantic import BaseModel
from typing import Any, Optional, Dict, List, Tuple
import json, datetime, re
from fastapi import UploadFile, File

from app.db import get_db
from app import models
from app.deps import get_current_user, UserClaims

router = APIRouter(prefix="/v1/marking_result", tags=["marking_result"])

# ---------- Utils ----------
_TERM_RX = re.compile(r"^\s*(\d{4})\s*(?:Term|T)?\s*([0-9]+)\s*$", re.IGNORECASE)
_REVIEW_DIFF_THRESHOLD = 5.0  # TODO: move to config if needed


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
    zid: str
    student_name: Optional[str] = None
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
    needs_review: Optional[bool] = None
    review_status: Optional[str] = None
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
    return {"ai_completed": bool(data.get("ai_completed"))}


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
    # me: UserClaims = Depends(get_current_user),  # Enable if needed
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

    data = load_json(json_path)
    data["course"] = c.code
    data["name"] = c.name or ""
    data["term"] = c.term or ""

    def to_float(value: Optional[float]) -> Optional[float]:
        try:
            return float(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    ai_value = to_float(payload.ai_total)
    tutor_value = to_float(payload.tutor_total)
    difference: Optional[float] = None
    if ai_value is not None and tutor_value is not None:
        difference = round(ai_value - tutor_value, 2)

    record = payload.dict()

    # needs_review rule
    if difference is not None:
        record["needs_review"] = abs(difference) >= _REVIEW_DIFF_THRESHOLD
    else:
        record["needs_review"] = bool(record.get("needs_review"))

    record.setdefault("review_status", "pending")
    record.setdefault("review_comments", "")
    record.setdefault("assignment", "")
    record.setdefault("student_name", "")
    record.setdefault("marked_by", "")

    record.update(
        {
            "ai_total": ai_value,
            "tutor_total": tutor_value,
            "difference": difference,
            "created_at": _now_utc_iso(),
        }
    )

    record["zid"] = str(record.get("zid", "")).strip()

    # upsert by zid
    updated = False
    for i, r in enumerate(data["marking_results"]):
        if isinstance(r, dict) and r.get("zid") == record["zid"]:
            data["marking_results"][i] = record
            updated = True
            break
    if not updated:
        data["marking_results"].append(record)

    save_json_atomic(json_path, data)
    return MarkingOut(**record)






# Update AI marking for the course
