from __future__ import annotations

import traceback
import sys
from pathlib import Path

from sqlalchemy.orm import Session

from ..db import SessionLocal
from .. import models
from ..utils.path_utils import assignment_dir
from .ai_bridge import copy_students_for_predict_to_ai
from .marking_sync import sync_ai_predictions_from_file

PROJECT_ROOT = Path(__file__).resolve().parents[3]
AI_DIR = PROJECT_ROOT / "AI"

for candidate in (PROJECT_ROOT, AI_DIR):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

def _run_predict_pipeline():
    from AI.scripts.predict_scores import run_predict_pipeline  # lazy import
    run_predict_pipeline()


def run_ai_marking_pipeline(assignment_id: int) -> None:
    """
    Prepare student submissions for AI scoring, run the AI pipeline,
    and sync the resulting scores into marking_result.
    """
    db: Session = SessionLocal()
    try:
        assignment: models.Assignment | None = db.get(models.Assignment, assignment_id)
        if assignment is None:
            print(f"[AI][RUNNER] Assignment {assignment_id} not found")
            return

        course = assignment.course
        if course is None:
            print(f"[AI][RUNNER] Assignment {assignment_id} missing course relation")
            return

        assignment_root = assignment_dir(course.code, course.term or "", assignment.title, assignment.id)
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

        sync_result = sync_ai_predictions_from_file(db, assignment_id, prediction_path)
        print(f"[AI][RUNNER] Synced AI results: {sync_result}")

    except Exception:
        print(f"[AI][RUNNER] Exception while processing assignment {assignment_id}:")
        traceback.print_exc()
    finally:
        db.close()
