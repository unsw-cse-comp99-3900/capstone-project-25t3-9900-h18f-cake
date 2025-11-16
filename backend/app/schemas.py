from typing import List, Optional

from pydantic import BaseModel, EmailStr, constr

from .models import ActorRole, PartKind, SubmissionStatus


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
    code: str
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

    class Config:
        from_attributes = True


class SubmissionOut(BaseModel):
    id: int
    assignment_id: int
    student_id: str
    path: str
    status: str

    class Config:
        from_attributes = True


class SubmissionFileOut(BaseModel):
    id: int
    step_index: int
    filename: str
    path: str
    mime: Optional[str] = None
    size: Optional[int] = None
    actor_role: ActorRole
    part_kind: PartKind

    class Config:
        from_attributes = True


class SubmissionDetailOut(BaseModel):
    id: int
    assignment_name: str
    course: str
    term: str | None = None
    status: SubmissionStatus
    student_id: Optional[str] = None
    files: List[SubmissionFileOut] = []

    class Config:
        from_attributes = True


class UserClaims(BaseModel):
    sub: str
    role: Optional[str] = None


class AssignmentFinalizeIn(BaseModel):
    assignment_name: Optional[str] = None
    course: Optional[str] = None
    term: Optional[str] = None
    step1_files: int = 0
    step2_files: int = 0
    step3_files: int = 0
    step4_files: int = 0
    step5_files: int = 0
    step6_files: int = 0
