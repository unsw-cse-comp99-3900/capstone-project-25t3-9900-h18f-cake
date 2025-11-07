# backend/app/utils/jobq.py
from __future__ import annotations
from threading import Lock
from ..services.ai_job_queue import AIJobQueue
from ..services.ai_runner import ai_worker 

_jobq = None
_lock = Lock()

def get_jobq() -> AIJobQueue:
    global _jobq
    with _lock:
        if _jobq is None:
            _jobq = AIJobQueue.instance(ai_worker)  
        return _jobq
