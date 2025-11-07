# backend/app/routers/ai_router.py
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Query
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Assignment
from ..services.marking_sync import sync_ai_predictions_from_file
from ..services.ai_job_queue import status_to_dict
from ..utils.jobq import get_jobq
router = APIRouter(prefix="/v1/ai", tags=["ai"])
# Put the repo root on sys.path (…/backend/app/routers -> parents[3] = repo root)
PROJECT_ROOT = Path(__file__).resolve().parents[3]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

AI_DIR = PROJECT_ROOT / "AI"
if str(AI_DIR) not in sys.path:
    sys.path.insert(0, str(AI_DIR))

def _try_imports() -> Dict[str, bool]:
    ok = {
        "ai_cfg": False,
        "rubric_assign_req.process_pipeline": False,
        "predict_scores.run_predict_pipeline": False,
    }
    try:
        import AI.scripts.config as _  # noqa
        ok["ai_cfg"] = True
    except Exception:
        pass
    try:
        from AI.scripts.rubric_assign_req import process_pipeline  # noqa
        ok["rubric_assign_req.process_pipeline"] = True
    except Exception:
        pass
    try:
        from AI.scripts.predict_scores import run_predict_pipeline  # noqa
        ok["predict_scores.run_predict_pipeline"] = True
    except Exception:
        pass
    return ok

def _load_assignment_meta(db: Session, assignment_id: int) -> Dict[str, Any]:
    a = db.get(Assignment, assignment_id)
    if not a:
        raise HTTPException(status_code=404, detail=f"Assignment {assignment_id} not found.")
    if not a.spec_url:
        raise HTTPException(status_code=400, detail="Assignment meta path (spec_url) is missing.")
    meta_path = Path(a.spec_url)
    if not meta_path.exists():
        raise HTTPException(status_code=400, detail=f"Assignment meta not found: {meta_path}")
    try:
        return json.loads(meta_path.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read assignment meta JSON: {e}")

@router.get("/health")
def ai_health():
    ok = _try_imports()
    return {
        "status": "ok",
        "project_root": str(PROJECT_ROOT),
        "imports": ok,
        "sys_path_head": sys.path[:5],
    }

@router.post("/init/{assignment_id}")
def ai_init_from_assignment(
    assignment_id: int,
    background: BackgroundTasks,
    which: str = Query("auto", description="auto|spec|rubric"),
    db: Session = Depends(get_db),
):
    """
    Use the assignment's spec/rubric file (from meta.json) to run the init pipeline.
    Calls AI.scripts.rubric_assign_req:process_pipeline(file_path).
    """
    meta = _load_assignment_meta(db, assignment_id)
    spec_path = (meta.get("spec_path") or "").strip()
    rubric_path = (meta.get("rubric_path") or "").strip()

    candidate: Optional[str] = None
    if which == "spec":
        candidate = spec_path
    elif which == "rubric":
        candidate = rubric_path
    else:
        candidate = rubric_path or spec_path

    if not candidate:
        raise HTTPException(status_code=400, detail="No valid spec/rubric path in assignment meta.")

    p = Path(candidate)
    if not p.exists():
        raise HTTPException(status_code=400, detail=f"Input file not found: {p}")

    def _task():
        print(f"[AI][INIT] process_pipeline('{p}')")
        from AI.scripts.rubric_assign_req import process_pipeline
        process_pipeline(str(p))

    background.add_task(_task)
    return {"status": "started", "assignment_id": assignment_id, "file": str(p)}

@router.post("/run")
def ai_run_predict(
    background: BackgroundTasks,
    course_id: int | None = Query(None, description="Optional: POST AI results back to /v1/marking_result/{course_id}/append"),
    backend_url: str = Query("http://localhost:8000", description="Backend base URL"),
):
    """
    Batch scoring — Calls AI.scripts.predict_scores:run_predict_pipeline.
    """
    def _task():
        print(f"[AI][RUN] run_predict_pipeline(course_id={course_id}, backend_url='{backend_url}')")
        from AI.scripts.predict_scores import run_predict_pipeline
        run_predict_pipeline(course_id=course_id, backend_url=backend_url)
        print("[AI][RUN] done")

    background.add_task(_task)
    return {"status": "started", "course_id": course_id}

@router.get("/result")
def ai_get_result():
    """
    Read the latest AI result JSON from AI.scripts.config.LLM_PREDICTION.
    """
    import AI.scripts.config as ai_cfg
    path = Path(ai_cfg.LLM_PREDICTION)
    if not path.exists():
        return {"status": "not_ready", "result": None}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read AI result JSON: {e}")
    return {"status": "done", "result": data, "path": str(path)}


@router.post("/sync/{assignment_id}")
def ai_sync_predictions(
    assignment_id: int,
    path: Optional[str] = Query(None, description="Override prediction JSON path"),
    db: Session = Depends(get_db),
):
    if path:
        prediction_path = Path(path)
    else:
        try:
            import AI.scripts.config as ai_cfg
            prediction_path = Path(ai_cfg.LLM_PREDICTION)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Failed to resolve default prediction path: {exc}")

    try:
        result = sync_ai_predictions_from_file(db, assignment_id, prediction_path)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Sync failed: {exc}")

    return {"status": "ok", "assignment_id": assignment_id, **result}
