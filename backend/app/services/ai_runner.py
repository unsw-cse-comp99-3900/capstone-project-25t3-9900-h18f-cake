from pathlib import Path
import threading, traceback, sys
from sqlalchemy.orm import Session
from ..db import SessionLocal
from .. import models
from ..utils.path_utils import assignment_dir
from .ai_bridge import copy_students_for_predict_to_ai
from .marking_sync import sync_ai_predictions_from_file

def ai_worker(assignment_id: int, st) -> None:
    print(f"[AI][WORKER] >>> START aid={assignment_id} thread={threading.current_thread().name}", flush=True)
    db: Session = SessionLocal()
    try:
        assignment: models.Assignment | None = db.get(models.Assignment, assignment_id)
        if not assignment or not assignment.course:
            print(f"[AI][WORKER] invalid assignment: {assignment_id}", flush=True)
            st.update(progress=1.0, message="invalid assignment")
            return

        assignment_root = assignment_dir(
            assignment.course.code,
            assignment.course.term or "",
            assignment.title,
            assignment.id
        )
        print(f"[AI][WORKER] aid={assignment_id} course={assignment.course.code} term={assignment.course.term} title={assignment.title!r}", flush=True)
        print(f"[AI][WORKER] assignment_root={assignment_root}", flush=True)

        st.update(progress=0.05, message="staging tutor files")
        print(f"[AI][WORKER] staging from: {assignment_root / 'submissions' / 'Student_assignment_with_Tutor_mark'}", flush=True)
        try:
            staged = copy_students_for_predict_to_ai(assignment_root, source="Tutor")
            print(f"[AI][WORKER] staged_files={len(staged)} sample={staged[:3]}", flush=True)
        except FileNotFoundError as exc:
            print(f"[AI][WORKER] no tutor files; skipped. detail={exc}", flush=True)
            st.update(progress=1.0, message="no tutor files; skipped")
            return
        except Exception as exc:
            st.update(progress=1.0, message=f"staging failed: {exc}")
            print("[AI][WORKER] staging failed:", exc, file=sys.stderr, flush=True)
            traceback.print_exc()
            return

        st.update(progress=0.15, message=f"staged {len(staged)} file(s)")

        from AI.scripts.predict_scores import run_predict_pipeline
        st.update(progress=0.20, message="running predict pipeline")
        print("[AI][WORKER] calling run_predict_pipeline()", flush=True)
        try:
            run_predict_pipeline()
            print("[AI][WORKER] run_predict_pipeline() finished", flush=True)
        except Exception:
            st.update(progress=1.0, message="predict failed")
            print("[AI][WORKER] run_predict_pipeline() FAILED:", file=sys.stderr, flush=True)
            traceback.print_exc()
            return

        st.update(progress=0.85, message="reading predictions")
        try:
            import AI.scripts.config as ai_cfg
            prediction_path = Path(ai_cfg.LLM_PREDICTION)
            print(f"[AI][WORKER] prediction_path={prediction_path} exists={prediction_path.exists()}", flush=True)
        except Exception:
            st.update(progress=1.0, message="resolve prediction path failed")
            print("[AI][WORKER] resolve prediction path FAILED:", file=sys.stderr, flush=True)
            traceback.print_exc()
            return

        try:
            sync_result = sync_ai_predictions_from_file(db, assignment_id, prediction_path)
            print(f"[AI][WORKER] sync_result={sync_result}", flush=True)
            st.update(progress=1.0, message=f"synced {sync_result.get('updated',0)} record(s)")
        except Exception:
            st.update(progress=1.0, message="sync failed")
            print("[AI][WORKER] sync failed:", file=sys.stderr, flush=True)
            traceback.print_exc()
            return

    finally:
        db.close()
        print(f"[AI][WORKER] <<< END aid={assignment_id}", flush=True)
