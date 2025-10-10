from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from .. import model, schemas
from ..deps import require_role

router = APIRouter(prefix="/v1/assignments", tags=["assignments"])

@router.post("/", response_model=schemas.AssignmentOut, dependencies=[Depends(require_role("admin","coordinator"))])
def create_assignment(payload: schemas.AssignmentIn, db: Session = Depends(get_db)):
    if not db.get(model.Course, payload.course_id):
        raise HTTPException(status_code=400, detail="Course not found")
    a = model.Assignment(**payload.model_dump())
    db.add(a); db.commit(); db.refresh(a)
    return a

@router.get("/", response_model=list[schemas.AssignmentOut])
def list_assignments(course_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(model.Assignment)
    if course_id:
        q = q.filter(model.Assignment.course_id == course_id)
    return q.all()
