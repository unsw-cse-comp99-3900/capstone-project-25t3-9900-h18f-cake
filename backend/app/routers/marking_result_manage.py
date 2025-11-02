
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pathlib import Path
from pydantic import BaseModel
from typing import Any, Optional, Dict, List, Tuple
import json, datetime, re

from app.db import get_db
from app import models
from app.deps import get_current_user, UserClaims

router = APIRouter(prefix="/v1/marking_result", tags=["marking_result"])

# ---------- Utils ----------
_TERM_RX = re.compile(r"^\s*(\d{4})\s*(?:Term|T)?\s*([0-9]+)\s*$", re.IGNORECASE)

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

    print(year, term_norm)
    return course_json_path_by_components(course.code, year, term_norm)

def load_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        # if file not exist
        return {
            "course": path.stem,
            "name": "",
            "term": "",
            "created_at": datetime.datetime.now().isoformat(),
            "ai_marking_finished": False,
            "marking_results": []
        }
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json_atomic(path: Path, data: Dict[str, Any]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    tmp.replace(path)

# ---------- Schemas ----------
class MarkingIn(BaseModel):
    zid: str
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


class MarkingOut(MarkingIn):
    # zid: str
    # ai_marking_detail: Optional[Dict[str, Any]] = None
    # tutor_marking_detail: Optional[Dict[str, Any]] = None
    # marked_by: Optional[str] = None
    # ai_marking_total: Optional[float] = None
    # tutor_marking_total: Optional[float] = None
    # difference: Optional[float] = None
    # tutor_feedback: Optional[str] = None
    # needs_review: Optional[bool] = None
    # review_status: Optional[str] = None
    created_at: str




# ---------- GET: through course_id toget  JSON  file content----------
@router.get("/by_id/{course_id}")
def get_course_marking_result_by_id(
    course_id: int,
    db: Session = Depends(get_db),
    # me: UserClaims = Depends(get_current_user),
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
    

    if not json_path.exists():
   
        return load_json(json_path)

    try:
        return load_json(json_path)
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
    # me: UserClaims = Depends(get_current_user),
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
        return load_json(json_path)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="JSON file corrupted")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")






# ---------- POST: through      course_id     append/rewrite marks（use zid upsert） ----------
@router.post("/{course_id}/append", response_model=MarkingOut)
def append_marking_result(
    course_id: int,
    payload: MarkingIn,
    db: Session = Depends(get_db),
    # me: UserClaims = Depends(get_current_user),
):
    c = db.get(models.Course, course_id)
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    # if c.owner_id != int(me.sub):
    #     raise HTTPException(status_code=403, detail="Forbidden")
    

    # print(c.code, c.term)

    try:
        json_path = course_json_path_by_course(c)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    data = load_json(json_path)
    data.setdefault("marking_results", [])


    ai_total = payload.ai_total 
    tutor_total = payload.tutor_total
    difference = None
    if ai_total is not None and tutor_total is not None:
        difference = round(tutor_total - ai_total, 2)

    record = payload.dict()


    if difference is not None and difference >= 5:
        record["needs_review"] = True
    else:
        record["needs_review"] = False
        
    record.update({
        "ai_total": ai_total,
        "tutor_total": tutor_total,
        "difference": difference,
        "created_at": datetime.datetime.now().isoformat(),
    })

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