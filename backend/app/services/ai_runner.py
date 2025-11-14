from __future__ import annotations

import traceback
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from ..db import SessionLocal
from .. import models
from ..utils.path_utils import assignment_dir
from .ai_bridge import copy_students_for_predict_to_ai,copy_teacher_marked_to_ai,copy_spec_and_rubric_to_ai
from .marking_sync import sync_ai_predictions_from_file

PROJECT_ROOT = Path(__file__).resolve().parents[3]
AI_DIR = PROJECT_ROOT / "AI"

for candidate in (PROJECT_ROOT, AI_DIR):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

def _run_predict_pipeline():
    from AI.scripts.predict_scores import run_predict_pipeline  # lazy import
    run_predict_pipeline()


def _fetch_assignment_ctx(assignment_id: int) -> tuple[models.Assignment, models.Course, Path] | None:
    session = SessionLocal()
    try:
        assignment = session.get(models.Assignment, assignment_id)
        if not assignment or not assignment.course:
            print(f"[AI][RUNNER] Assignment {assignment_id} not found or missing course relation")
            return None
        course = assignment.course
        assignment_root = assignment_dir(course.code, course.term or "", assignment.title, assignment.id)
        return assignment, course, assignment_root
    finally:
        session.close()


def run_ai_marking_pipeline(assignment_id: int) -> None:
    """
    Prepare student submissions for AI scoring, run the AI pipeline,
    and sync the resulting scores into marking_result.
    """
    ctx = _fetch_assignment_ctx(assignment_id)
    if ctx is None:
        return

    assignment, course, assignment_root = ctx

    try:
        copy_spec_and_rubric_to_ai(assignment_root)
        print(f"[AI][RUNNER] Sending assignment specific and rubric to LLM model.")
        copy_teacher_marked_to_ai(assignment_root, source="coordinator")
        print(f"[AI][RUNNER] Preparing RAG Data Base.")
    except FileNotFoundError as exc:
        print(f"[AI][RUNNER] Missing spec/rubric or coordinator samples: {exc}")
        return

    try:
        staged = copy_students_for_predict_to_ai(assignment_root, source="Tutor")
        print(f"[AI][RUNNER] Prepared {len(staged)} files for AI scoring.")
    except FileNotFoundError as exc:
        print(f"[AI][RUNNER] Skipping AI scoring: {exc}")
        return

    _run_predict_pipeline()

    try:
        import AI.scripts.config as ai_cfg
        prediction_path = Path(ai_cfg.LLM_PREDICTION)
    except Exception as exc:
        print(f"[AI][RUNNER] Failed to resolve prediction path: {exc}")
        return

    db: Session = SessionLocal()
    try:
        sync_result = sync_ai_predictions_from_file(db, assignment_id, prediction_path)
        print(f"[AI][RUNNER] Synced AI results: {sync_result}")
    except Exception:
        print(f"[AI][RUNNER] Exception while syncing assignment {assignment_id}:")
        traceback.print_exc()
    finally:
        db.close()
