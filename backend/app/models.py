from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
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
    name = Column(String(255), nullable=False)
    term = Column(String(64))
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

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
    course_id = Column(Integer, ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    rubric_json = Column(Text)
    spec_url = Column(Text)

    course = relationship("Course", back_populates="assignments")
    submissions = relationship(
        "Submission",
        back_populates="assignment",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

class Submission(Base):
    __tablename__ = "submissions"
    id = Column(Integer, primary_key=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    student_id = Column(String(64), nullable=False)
    file_url = Column(Text, nullable=False)
    status = Column(String(32), default="uploaded")
    assignment = relationship("Assignment", back_populates="submissions")
