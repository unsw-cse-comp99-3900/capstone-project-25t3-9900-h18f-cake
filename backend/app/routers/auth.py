from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..db import get_db, Base, engine
from .. import models, schemas
from ..security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/v1/auth", tags=["auth"])

Base.metadata.create_all(bind=engine)

@router.post("/register", response_model=schemas.UserOut)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter_by(email=payload.email).first():
        raise HTTPException(status_code=400, detail="Email exists")
    user = models.User(email=payload.email,
                       password_hash=hash_password(payload.password),
                       role=payload.role)
    db.add(user); db.commit(); db.refresh(user)
    return user

@router.post("/login", response_model=schemas.TokenOut)
def login(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter_by(email=payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(str(user.id), user.role)
    return {"access_token": token}
