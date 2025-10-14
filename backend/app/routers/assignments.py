from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas
from ..deps import require_role
from ..deps import get_current_user, UserClaims

router = APIRouter(prefix="/v1/assignments", tags=["assignments"])

@router.post("/", response_model=schemas.AssignmentOut)
def create_assignment(payload: schemas.AssignmentIn,
                      db: Session = Depends(get_db),
                      me: UserClaims = Depends(get_current_user)):
    course = db.get(models.Course, payload.course_id)
    if not course:
        raise HTTPException(400, "Course not found")
    if course.owner_id != int(me.sub):
        raise HTTPException(403, "Not your course")
    a = models.Assignment(**payload.model_dump())
    db.add(a); db.commit(); db.refresh(a)
    return a

@router.get("/", response_model=list[schemas.AssignmentOut])
def list_assignments(course_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(models.Assignment)
    if course_id:
        q = q.filter(models.Assignment.course_id == course_id)
    return q.all()
