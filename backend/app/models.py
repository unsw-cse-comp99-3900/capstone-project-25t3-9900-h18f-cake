from datetime import datetime
from enum import Enum

from sqlalchemy import Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), default="coordinator")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    courses = relationship(
        "Course",
        back_populates="owner",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True)
    code = Column(String(64), nullable=False)
    name = Column(String(255), nullable=False)
    term = Column(String(64))
    owner_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    __table_args__ = (
        UniqueConstraint("owner_id", "term", "code", name="uq_course_owner_term_code"),
    )

    owner = relationship("User", back_populates="courses", lazy="joined")
    assignments = relationship(
        "Assignment",
        back_populates="course",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True)
    course_id = Column(
        Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(255), nullable=False)

    rubric_json = Column(Text, nullable=True)
    spec_url = Column(Text, nullable=True)
    meta_json = Column(Text, nullable=True)

    course = relationship("Course", back_populates="assignments")

    submissions = relationship(
        "Submission",
        back_populates="assignment",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ActorRole(str, Enum):
    COORDINATOR = "COORDINATOR"
    TUTOR = "TUTOR"


class PartKind(str, Enum):
    ASSIGNMENT = "ASSIGNMENT"
    SCORE = "SCORE"


class SubmissionStatus(str, Enum):
    DRAFT = "DRAFT"
    WAIT_COORDINATOR = "WAIT_COORDINATOR"
    WAIT_TUTOR = "WAIT_TUTOR"
    READY_FOR_REVIEW = "READY_FOR_REVIEW"
    COMPLETED = "COMPLETED"


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    assignment_id: Mapped[int | None] = mapped_column(
        ForeignKey("assignments.id"), nullable=True
    )

    assignment_name: Mapped[str]
    course: Mapped[str]
    term: Mapped[str]

    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))

    status: Mapped[SubmissionStatus] = mapped_column(
        SQLEnum(SubmissionStatus), default=SubmissionStatus.DRAFT, index=True
    )

    student_id: Mapped[str | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )
    meta_json: Mapped[str | None] = mapped_column(nullable=True)

    assignment: Mapped["Assignment"] = relationship(
        "Assignment", back_populates="submissions"
    )

    files: Mapped[list["SubmissionFile"]] = relationship(
        "SubmissionFile",
        back_populates="submission",
        cascade="all, delete-orphan",
    )


class SubmissionFile(Base):
    __tablename__ = "submission_files"
    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(ForeignKey("submissions.id"), index=True)
    step_index: Mapped[int] = mapped_column(index=True)
    actor_role: Mapped[ActorRole] = mapped_column(SQLEnum(ActorRole), index=True)
    part_kind: Mapped[PartKind] = mapped_column(SQLEnum(PartKind), index=True)

    filename: Mapped[str]
    path: Mapped[str]
    mime: Mapped[str | None]
    size: Mapped[int | None]
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    uploaded_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    submission: Mapped["Submission"] = relationship(
        "Submission", back_populates="files"
    )


class SystemLog(Base):
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    level = Column(String(16), default="INFO", nullable=False)
    action = Column(String(128), nullable=False, index=True)
    message = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"), nullable=True)
    metadata_json = Column(Text, nullable=True)

    user = relationship("User", lazy="joined")
    course = relationship("Course", lazy="joined")
    assignment = relationship("Assignment", lazy="joined")
