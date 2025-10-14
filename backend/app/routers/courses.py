from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models, schemas
from ..deps import get_current_user, UserClaims

router = APIRouter(prefix="/v1/courses", tags=["courses"])

@router.post("/", response_model=schemas.CourseOut)
def create_course(payload: schemas.CourseIn,
                  db: Session = Depends(get_db),
                  me: UserClaims = Depends(get_current_user)):
    c = models.Course(**payload.model_dump(), owner_id=int(me.sub))
    db.add(c); db.commit(); db.refresh(c)
    return c

@router.get("/", response_model=list[schemas.CourseOut])
def list_courses(db: Session = Depends(get_db),
                 me: UserClaims = Depends(get_current_user)):
    return db.query(models.Course).filter(models.Course.owner_id == int(me.sub)).all()

@router.delete("/{course_id}", status_code=204)
def delete_course(
    course_id: int,
    db: Session = Depends(get_db),
    me: UserClaims = Depends(get_current_user)
):
    c = db.get(models.Course, course_id)
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    if c.owner_id != int(me.sub):
        raise HTTPException(status_code=403, detail="Forbidden")
    db.delete(c)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)