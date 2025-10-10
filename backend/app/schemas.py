from pydantic import BaseModel, EmailStr
from typing import Optional

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "coordinator"

class UserOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    class Config: from_attributes = True

class CourseIn(BaseModel):
    name: str
    term: Optional[str] = None

class CourseOut(CourseIn):
    id: int
    class Config: from_attributes = True

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
