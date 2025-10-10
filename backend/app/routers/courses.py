from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db
from app import model, schemas
from ..deps import require_role

router = APIRouter(prefix="/v1/courses", tags=["courses"])

@router.post("/", response_model=schemas.CourseOut, dependencies=[Depends(require_role("admin"))])
def create_course(payload: schemas.CourseIn, db: Session = Depends(get_db)):
    c = model.Course(**payload.model_dump())
    db.add(c); db.commit(); db.refresh(c)
    return c

@router.get("/", response_model=list[schemas.CourseOut])
def list_courses(db: Session = Depends(get_db)):
    return db.query(model.Course).all()
