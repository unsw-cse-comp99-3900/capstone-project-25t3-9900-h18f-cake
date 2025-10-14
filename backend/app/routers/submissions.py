# app/routers/submissions.py
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas
from ..deps import get_current_user, UserClaims
from ..utils.files import save_upload

router = APIRouter(prefix="/v1/submissions", tags=["submissions"])

@router.post("/upload", response_model=schemas.SubmissionOut)
async def upload_submission(
    assignment_id: int = Form(...),
    student_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    me: UserClaims = Depends(get_current_user),
):
    assignment = db.get(models.Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=400, detail="Assignment not found")

    course = db.get(models.Course, assignment.course_id)
    if not course:
        raise HTTPException(status_code=400, detail="Course not found")

    if int(course.owner_id) != int(me.sub):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your course")

    path = await save_upload(file, subdir=f"assignment_{assignment_id}")
    sub = models.Submission(
        assignment_id=assignment_id, student_id=student_id, file_url=path
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub
