from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from .. import model, schemas
from ..deps import require_role
from ..utils.files import save_upload

router = APIRouter(prefix="/v1/submissions", tags=["submissions"])

@router.post("/upload", response_model=schemas.SubmissionOut, dependencies=[Depends(require_role("coordinator","admin"))])
async def upload_submission(
    assignment_id: int = Form(...),
    student_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not db.get(model.Assignment, assignment_id):
        raise HTTPException(status_code=400, detail="Assignment not found")
    path = await save_upload(file, subdir=f"assignment_{assignment_id}")
    sub = model.Submission(assignment_id=assignment_id, student_id=student_id, file_url=path)
    db.add(sub); db.commit(); db.refresh(sub)
    return sub
