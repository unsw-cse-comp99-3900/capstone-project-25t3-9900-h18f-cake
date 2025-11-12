import os
import re
import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import or_
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import settings
from ..db import get_db
from ..deps import get_current_user
from ..services.system_log_service import record_system_log
from ..utils.file_utils import save_meta_json

router = APIRouter(prefix="/v1/assignments", tags=["assignments"])


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^\w\s-]", "", value)
    value = re.sub(r"[\s-]+", "-", value)
    return value


def _course_term_dir(course: str, term: str) -> str:
    c = _slugify(course)
    t = _slugify(term) if term else "noterm"
    return f"{c}-{t}"


def _assignment_dir(course: str, term: str, title: str, assignment_id: int) -> Path:
    slug = f"{_slugify(title)}-{assignment_id}"
    return settings.upload_root / _course_term_dir(course, term) / slug


@router.post("/create_with_files", response_model=schemas.AssignmentOut)
def create_assignment_with_files(
    course: str = Form(...),
    term: str = Form(""),
    title: str = Form(...),
    step1: UploadFile = File(...),  # spec
    step2: UploadFile = File(...),  # rubric
    db: Session = Depends(get_db),
    me=Depends(get_current_user),
):
    # ---------- Validate course ----------
    norm_term = (term or "").strip() or None
    q = db.query(models.Course).filter(
        models.Course.owner_id == int(me.sub),
        or_(models.Course.code == course, models.Course.name == course),
        models.Course.term == norm_term,
    )
    course_row = q.first()
    if not course_row:
        raise HTTPException(status_code=400, detail="Course not found")

    # ---------- Create assignment ----------
    a = models.Assignment(course_id=course_row.id, title=title)
    db.add(a)
    db.flush()  # Ensure ID exists for naming paths

    base: Path = _assignment_dir(course, term, title, a.id)
    spec_dir = base / "spec"
    rubric_dir = base / "rubric"
    spec_dir.mkdir(parents=True, exist_ok=True)
    rubric_dir.mkdir(parents=True, exist_ok=True)

    # ---------- File validation helper ----------
    def _ensure_valid_file(u: UploadFile):
        allowed_exts = {".pdf", ".doc", ".docx"}
        allowed_types = {
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        ext = Path(u.filename).suffix.lower()
        ctype = (u.content_type or "").lower()
        if ext not in allowed_exts or ctype not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Only PDF or Word files (.doc, .docx) are accepted",
            )
        if ext == ".pdf":
            head = u.file.read(5)
            u.file.seek(0)
            if head != b"%PDF-":
                raise HTTPException(
                    status_code=400, detail="Invalid PDF file signature"
                )

    # ---------- Validate & save specification ----------
    _ensure_valid_file(step1)
    spec_ext = Path(step1.filename).suffix.lower()
    spec_path = spec_dir / f"specification{spec_ext}"
    with open(spec_path, "wb") as f:
        shutil.copyfileobj(step1.file, f)

    # ---------- Validate & save rubric ----------
    _ensure_valid_file(step2)
    rubric_ext = Path(step2.filename).suffix.lower()
    rubric_path = rubric_dir / f"rubric{rubric_ext}"
    with open(rubric_path, "wb") as f:
        shutil.copyfileobj(step2.file, f)

    # ---------- Save metadata ----------
    meta = {
        "assignment_id": a.id,
        "course": course,
        "term": term,
        "title": title,
        "spec_path": str(spec_path),
        "rubric_path": str(rubric_path),
        "spec_url": None,
        "rubric_url": None,
        "created_by": me.sub,
        "created_at": datetime.utcnow().isoformat(),
    }
    meta_path = save_meta_json(base, meta)
    a.spec_url = str(meta_path)

    db.commit()
    db.refresh(a)
    record_system_log(
        db,
        action="assignment.uploaded",
        message=f"Assignment '{title}' uploaded successfully",
        user_id=int(me.sub) if me and me.sub else None,
        course_id=course_row.id,
        assignment_id=a.id,
        metadata={
            "course": course_row.code,
            "term": course_row.term,
            "title": title,
            "spec_path": str(spec_path),
            "rubric_path": str(rubric_path),
        },
    )
    return a


# @router.post("/create_with_files", response_model=schemas.AssignmentOut)
# def create_assignment_with_files(
#     course: str = Form(...),
#     term: str = Form(""),
#     title: str = Form(...),
#     step1: UploadFile = File(...),
#     step2: UploadFile = File(...),
#     db: Session = Depends(get_db),
#     me = Depends(get_current_user),
# ):
#     norm_term = (term or "").strip() or None
#     q = (
#         db.query(models.Course)
#         .filter(
#             models.Course.owner_id == int(me.sub),
#             or_(models.Course.code == course, models.Course.name == course),
#             models.Course.term == norm_term,
#         )
#     )
#     course_row = q.first()
#     if not course_row:
#         raise HTTPException(status_code=400, detail="Course not found")

#     a = models.Assignment(course_id=course_row.id, title=title)
#     db.add(a)
#     db.flush()

#     base: Path = _assignment_dir(course, term, title, a.id)
#     spec_dir = base / "spec"
#     rubric_dir = base / "rubric"
#     spec_dir.mkdir(parents=True, exist_ok=True)
#     rubric_dir.mkdir(parents=True, exist_ok=True)

#     spec_suffix = Path(step1.filename).suffix or ".pdf"
#     rubric_suffix = Path(step2.filename).suffix or ".pdf"
#     spec_path = spec_dir / f"specification{spec_suffix}"
#     rubric_path = rubric_dir / f"rubric{rubric_suffix}"

#     with open(spec_path, "wb") as f:
#         shutil.copyfileobj(step1.file, f)
#     with open(rubric_path, "wb") as f:
#         shutil.copyfileobj(step2.file, f)

#     meta = {
#         "assignment_id": a.id,
#         "course": course,
#         "term": term,
#         "title": title,
#         "spec_path": str(spec_path),
#         "rubric_path": str(rubric_path),
#         "spec_url": None,
#         "rubric_url": None,
#         "created_by": me.sub,
#     }
#     meta_path = save_meta_json(base, meta)
#     a.spec_url = str(meta_path)

#     db.commit()
#     db.refresh(a)
#     return a


# @router.put("/{assignment_id}/files", response_model=schemas.AssignmentOut)
# def update_assignment_files(
#     assignment_id: int,
#     spec: UploadFile | None = File(None),
#     rubric: UploadFile | None = File(None),
#     db: Session = Depends(get_db),
#     me = Depends(get_current_user),
# ):
#     a = db.get(models.Assignment, assignment_id)
#     if not a:
#         raise HTTPException(status_code=404, detail="Assignment not found")
#     base = Path(a.spec_url).parent if a.spec_url else (settings.upload_root / "assignments" / str(a.id))
#     spec_dir = base / "spec"
#     rubric_dir = base / "rubric"
#     spec_dir.mkdir(parents=True, exist_ok=True)
#     rubric_dir.mkdir(parents=True, exist_ok=True)

#     def _ensure_pdf(u: UploadFile):
#         if (Path(u.filename).suffix.lower() != ".pdf") or ((u.content_type or "").lower() != "application/pdf"):
#             raise HTTPException(status_code=400, detail="Only PDF is accepted")
#         head = u.file.read(5); u.file.seek(0)
#         if head != b"%PDF-":
#             raise HTTPException(status_code=400, detail="Invalid PDF file")

#     if spec:
#         _ensure_pdf(spec)
#         for p in spec_dir.glob("*.pdf"):
#             p.unlink(missing_ok=True)
#         dest = spec_dir / "specification.pdf"
#         with open(dest, "wb") as f:
#             shutil.copyfileobj(spec.file, f)

#     if rubric:
#         _ensure_pdf(rubric)
#         for p in rubric_dir.glob("*.pdf"):
#             p.unlink(missing_ok=True)
#         dest = rubric_dir / "rubric.pdf"
#         with open(dest, "wb") as f:
#             shutil.copyfileobj(rubric.file, f)

#     meta = {
#         "assignment_id": a.id,
#         "spec_path": str(spec_dir / "specification.pdf") if spec else None,
#         "rubric_path": str(rubric_dir / "rubric.pdf") if rubric else None,
#         "updated_at": datetime.utcnow().isoformat(),
#     }
#     meta_path = save_meta_json(base, meta)
#     a.spec_url = str(meta_path)

#     db.commit()
#     db.refresh(a)
#     return a


@router.put("/{assignment_id}/files", response_model=schemas.AssignmentOut)
def update_assignment_files(
    assignment_id: int,
    spec: UploadFile | None = File(None),
    rubric: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    me=Depends(get_current_user),
):
    a = db.get(models.Assignment, assignment_id)
    if not a:
        raise HTTPException(status_code=404, detail="Assignment not found")

    base = (
        Path(a.spec_url).parent
        if a.spec_url
        else (settings.upload_root / "assignments" / str(a.id))
    )
    spec_dir = base / "spec"
    rubric_dir = base / "rubric"
    spec_dir.mkdir(parents=True, exist_ok=True)
    rubric_dir.mkdir(parents=True, exist_ok=True)

    def _ensure_valid_file(u: UploadFile):
        allowed_exts = {".pdf", ".doc", ".docx"}
        allowed_types = {
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }
        ext = Path(u.filename).suffix.lower()
        ctype = (u.content_type or "").lower()
        if ext not in allowed_exts or ctype not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Only PDF or Word files (.doc, .docx) are accepted",
            )
        if ext == ".pdf":
            head = u.file.read(5)
            u.file.seek(0)
            if head != b"%PDF-":
                raise HTTPException(
                    status_code=400, detail="Invalid PDF file signature"
                )

    if spec:
        _ensure_valid_file(spec)
        for p in spec_dir.glob("*"):
            p.unlink(missing_ok=True)
        dest = spec_dir / f"specification{Path(spec.filename).suffix.lower()}"
        with open(dest, "wb") as f:
            shutil.copyfileobj(spec.file, f)

    if rubric:
        _ensure_valid_file(rubric)
        for p in rubric_dir.glob("*"):
            p.unlink(missing_ok=True)
        dest = rubric_dir / f"rubric{Path(rubric.filename).suffix.lower()}"
        with open(dest, "wb") as f:
            shutil.copyfileobj(rubric.file, f)

    meta = {
        "assignment_id": a.id,
        "spec_path": str(dest if spec else None),
        "rubric_path": str(dest if rubric else None),
        "updated_at": datetime.utcnow().isoformat(),
    }
    meta_path = save_meta_json(base, meta)
    a.spec_url = str(meta_path)

    db.commit()
    db.refresh(a)
    return a
