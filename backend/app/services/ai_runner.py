import json
import sys
import threading
import traceback
from pathlib import Path

from sqlalchemy.orm import Session

from .. import models
from ..db import SessionLocal
from ..routers.marking_result_manage import (
    course_json_path_by_course,
    load_json,
    save_json_atomic,
)
from ..services.system_log_service import record_system_log
from ..utils.path_utils import assignment_dir
from .ai_bridge import copy_students_for_predict_to_ai,copy_teacher_marked_to_ai,copy_spec_and_rubric_to_ai
from .marking_sync import sync_ai_predictions_from_file


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







def ai_worker(assignment_id: int, st) -> None:
    print(
        f"[AI][WORKER] >>> START aid={assignment_id} thread={threading.current_thread().name}",
        flush=True,
    )
    db: Session = SessionLocal()

    ctx = _fetch_assignment_ctx(assignment_id)
    if ctx is None:
        return

    assignment, course, assignment_root = ctx


    try:
        # copy_spec_and_rubric_to_ai(assignment_root)
        # print(f"[AI][RUNNER] Sending assignment specific and rubric to LLM model.")
        copy_teacher_marked_to_ai(assignment_root, source="coordinator")
        print(f"[AI][RUNNER] Preparing RAG Data Base.")
    except FileNotFoundError as exc:
        print(f"[AI][RUNNER] Missing spec/rubric or coordinator samples: {exc}")
        return






    try:
        assignment: models.Assignment | None = db.get(models.Assignment, assignment_id)
        if not assignment or not assignment.course:
            print(f"[AI][WORKER] invalid assignment: {assignment_id}", flush=True)
            st.update(progress=1.0, message="invalid assignment")
            return

        # Mark AI status as started (ai_completed = False)
        try:
            json_path = course_json_path_by_course(assignment.course)
            data = load_json(json_path)
            data["ai_completed"] = False
            save_json_atomic(json_path, data)
            print(
                f"[AI][WORKER] set ai_completed=False for course {assignment.course.code}",
                flush=True,
            )
        except Exception:
            print(
                "[AI][WORKER] failed to set ai_completed False",
                file=sys.stderr,
                flush=True,
            )

        assignment_root = assignment_dir(
            assignment.course.code,
            assignment.course.term or "",
            assignment.title,
            assignment.id,
        )
        print(
            f"[AI][WORKER] aid={assignment_id} course={assignment.course.code} term={assignment.course.term} title={assignment.title!r}",
            flush=True,
        )
        print(f"[AI][WORKER] assignment_root={assignment_root}", flush=True)

        st.update(progress=0.05, message="staging tutor files")
        print(
            f"[AI][WORKER] staging from: {assignment_root / 'submissions' / 'Student_assignment_with_Tutor_mark'}",
            flush=True,
        )
        try:
            staged = copy_students_for_predict_to_ai(assignment_root, source="Tutor")
            print(
                f"[AI][WORKER] staged_files={len(staged)} sample={staged[:3]}",
                flush=True,
            )
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
        pipeline_summary = None
        try:
            pipeline_summary = run_predict_pipeline()
            print("[AI][WORKER] run_predict_pipeline() finished", flush=True)
        except Exception:
            st.update(progress=1.0, message="predict failed")
            print(
                "[AI][WORKER] run_predict_pipeline() FAILED:",
                file=sys.stderr,
                flush=True,
            )
            traceback.print_exc()
            return

        st.update(progress=0.85, message="reading predictions")
        try:
            import AI.scripts.config as ai_cfg

            prediction_path = Path(ai_cfg.LLM_PREDICTION)
            print(
                f"[AI][WORKER] prediction_path={prediction_path} exists={prediction_path.exists()}",
                flush=True,
            )
        except Exception:
            st.update(progress=1.0, message="resolve prediction path failed")
            print(
                "[AI][WORKER] resolve prediction path FAILED:",
                file=sys.stderr,
                flush=True,
            )
            traceback.print_exc()
            return

        try:
            sync_result = sync_ai_predictions_from_file(
                db, assignment_id, prediction_path
            )
            print(f"[AI][WORKER] sync_result={sync_result}", flush=True)
            # Mark AI status as completed (ai_completed = True)
            try:
                json_path = course_json_path_by_course(assignment.course)
                data = load_json(json_path)
                data["ai_completed"] = True
                save_json_atomic(json_path, data)
                print(
                    f"[AI][WORKER] set ai_completed=True for course {assignment.course.code}",
                    flush=True,
                )
            except Exception:
                print(
                    "[AI][WORKER] failed to set ai_completed True",
                    file=sys.stderr,
                    flush=True,
                )
            failed_students = []
            if isinstance(pipeline_summary, dict):
                failed_students = pipeline_summary.get("failed_students") or []
            success_count = int(sync_result.get("updated", 0))
            retry_count = len(failed_students)
            fail_count = retry_count  # Treat exhausted retries as failures
            msg = (
                f"synced {success_count} record(s); "
                f"retry_needed={retry_count}; fail={fail_count}"
            )
            st.update(progress=1.0, message=msg)

        except Exception:
            st.update(progress=1.0, message="sync failed")
            print("[AI][WORKER] sync failed:", file=sys.stderr, flush=True)
            traceback.print_exc()
            return

    finally:
        try:
            metadata = {
                "success_count": success_count,
                "retry_count": retry_count,
                "fail_count": fail_count,
                "failed_students": failed_students,
            }
            existing_log = (
                db.query(models.SystemLog)
                .filter(
                    models.SystemLog.assignment_id == assignment_id,
                    models.SystemLog.action == "ai_marking",
                )
                .first()
            )
            message = (
                f"AI marking summary for assignment '{assignment.title}': "
                f"success={success_count}, retry={retry_count}, fail={fail_count}."
            )
            if existing_log:
                existing_log.message = message
                existing_log.level = "INFO"
                existing_log.course_id = assignment.course.id
                existing_log.metadata_json = json.dumps(
                    metadata, ensure_ascii=False
                )
                db.commit()
            else:
                record_system_log(
                    db,
                    action="ai_marking",
                    message=message,
                    user_id=None,
                    course_id=assignment.course.id,
                    assignment_id=assignment_id,
                    metadata=metadata,
                )
        except Exception:
            print(
                "[AI][WORKER] failed to record AI status summary",
                file=sys.stderr,
                flush=True,
            )

        print(f"[AI][RUNNER] marking completed for assignment {assignment_id}", flush=True)
        db.close()
        print(f"[AI][WORKER] <<< END aid={assignment_id}", flush=True)
