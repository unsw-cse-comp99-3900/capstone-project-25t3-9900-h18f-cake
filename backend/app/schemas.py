from pydantic import BaseModel, EmailStr, constr
from typing import Optional

class TokenOut(BaseModel):
    access_token: str

class UserCreate(BaseModel):
    email: EmailStr
    password: constr(min_length=6, max_length=256)

class UserOut(BaseModel):
    id: int
    email: EmailStr
    class Config:
        from_attributes = True

class CourseIn(BaseModel):
    name: str
    term: Optional[str] = None

class CourseOut(CourseIn):
    id: int
    name: str
    term: str | None = None
    owner_id: int
    class Config:
        from_attributes = True

class AssignmentIn(BaseModel):
    course_id: int
    title: str
    rubric_json: Optional[str] = None
    spec_url: Optional[str] = None

class AssignmentOut(AssignmentIn):
    id: int
    class Config: from_attributes = True

class SubmissionOut(BaseModel):
    id: int
    assignment_id: int
    student_id: str
    file_url: str
    status: str
    class Config: from_attributes = True

class UserClaims(BaseModel):
    sub: str
    role: Optional[str] = None 
