# app/utils/path_utils.py
from __future__ import annotations

import os
import re
from pathlib import Path

from ..config import settings


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^\w\s-]", "", value)
    value = re.sub(r"[\s-]+", "-", value)
    return value


def course_term_dir(course: str, term: str) -> str:
    c = slugify(course)
    t = slugify(term) if term else "noterm"
    return f"{c}-{t}"


def assignment_dir(course: str, term: str, title: str, assignment_id: int) -> Path:
    root = settings.upload_root
    slug = f"{slugify(title)}-{assignment_id}"
    return root / course_term_dir(course, term) / slug


def student_dir(assignment_root: Path, student_id: str) -> Path:
    return assignment_root / "submissions" / student_id.lower()


def step_bucket(step_index: int) -> str:
    mapping = {
        3: "ass_marked_by_coor",
        4: "score_marked_by_coor",
        5: "ass_marked_by_tut",
        6: "score_marked_by_tut",
    }
    return mapping.get(step_index, f"step{step_index}")
