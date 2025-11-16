import datetime
import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import and_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..db import get_db
from ..deps import UserClaims, get_current_user
from ..services.system_log_service import record_system_log

router = APIRouter(prefix="/v1/courses", tags=["courses"])


@router.post("/", response_model=schemas.CourseOut, status_code=201)
def create_course(
    payload: schemas.CourseIn,
    db: Session = Depends(get_db),
    me: UserClaims = Depends(get_current_user),
):
    code = (payload.code or "").strip()
    name = (payload.name or "").strip()
    term = (payload.term or "").strip() or None

    if not code:
        raise HTTPException(status_code=400, detail="Course code is required")
    if not name:
        raise HTTPException(status_code=400, detail="Course name is required")
    exists = (
        db.query(models.Course)
        .filter(
            and_(
                models.Course.owner_id == int(me.sub),
                models.Course.term == term,
                models.Course.code == code,
            )
        )
        .first()
    )
    if exists:
        raise HTTPException(
            status_code=400, detail="This course code already exists in the same term"
        )

    year, spec_term = term.split("Term")
    year = year.strip()
    spec_term = spec_term.strip()
    spec_term = f"Term{spec_term}"
    Json_name = f"{year}_{spec_term}"

    c = models.Course(code=code, name=name, term=term, owner_id=int(me.sub))
    db.add(c)
    db.commit()
    db.refresh(c)

    # create folder and json file for this new course
    base_folder = Path("./marking_result")
    folder = base_folder / Json_name
    folder.mkdir(parents=True, exist_ok=True)

    file_path = folder / f"{code}.json"
    if not file_path.exists():
        init_data = {
            "course": code,
            "name": name,
            "term": term,
            "created_at": datetime.datetime.now().isoformat(),
            "ai_marking_finished": False,
            "marking_results": [],
        }
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(init_data, f, indent=4, ensure_ascii=False)
    record_system_log(
        db,
        action="course.created",
        message=f"Course '{code}' ({term}) created",
        user_id=int(me.sub),
        course_id=c.id,
        metadata={"course": code, "name": name, "term": term},
    )
    return c


@router.get("/", response_model=list[schemas.CourseOut])
def list_courses(
    db: Session = Depends(get_db),
    me: UserClaims = Depends(get_current_user),
):
    return (
        db.query(models.Course)
        .filter(models.Course.owner_id == int(me.sub))
        .order_by(models.Course.term.nullsfirst(), models.Course.code.asc())
        .all()
    )


@router.delete("/{course_id}", status_code=204)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    me: UserClaims = Depends(get_current_user),
):
    c = db.get(models.Course, course_id)

    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    if c.owner_id != int(me.sub):
        raise HTTPException(status_code=403, detail="Forbidden")

    # get the info about course code and course term
    year, spec_term = c.term.split("Term")
    spec_term = f"Term{spec_term}"

    year = year.strip()
    spec_term = spec_term.strip()

    folder = Path("marking_result") / f"{year}_{spec_term}"
    file_path = folder / f"{c.code}.json"

    if file_path.exists():
        file_path.unlink()
        print(f"Deleted {file_path.resolve()}")

    course_meta = {"course": c.code, "name": c.name, "term": c.term}
    db.delete(c)
    db.commit()
    record_system_log(
        db,
        action="course.deleted",
        message=f"Course '{course_meta['course']}' ({course_meta['term']}) deleted",
        user_id=int(me.sub),
        course_id=course_id,
        metadata=course_meta,
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
