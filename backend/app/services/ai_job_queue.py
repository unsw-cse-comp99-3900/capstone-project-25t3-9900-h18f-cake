from __future__ import annotations
import time, traceback, threading, queue
from dataclasses import dataclass, asdict
from typing import Callable, Dict, Optional, Any

@dataclass
class JobStatus:
    state: str = "queued"       # queued | running | done | error
    progress: float = 0.0       # 0.0 ~ 1.0
    message: str = ""
    error: Optional[str] = None
    updated_at: float = time.time()

def status_to_dict(s: JobStatus) -> Dict[str, Any]:
    return asdict(s)

class StatusProxy:
    def __init__(self, st: JobStatus, touch):
        self._st = st
        self._touch = touch
    def update(self, *, progress: Optional[float] = None, message: Optional[str] = None):
        if progress is not None:
            self._st.progress = max(0.0, min(1.0, float(progress)))
        if message is not None:
            self._st.message = message
        self._touch()

class AIJobQueue:
    _instance: "AIJobQueue" | None = None
    _guard = threading.Lock()

    def __init__(self, worker: Callable[[int, StatusProxy], None]):
        self.worker = worker
        self._q: "queue.Queue[int]" = queue.Queue()
        self._in_queue: set[int] = set()
        self._status: Dict[int, JobStatus] = {}
        self._rerun: set[int] = set()
        self._t = threading.Thread(target=self._loop, daemon=True, name="ai-job-worker")
        self._t.start()

    @classmethod
    def instance(cls, worker: Callable[[int, StatusProxy], None]) -> "AIJobQueue":
        with cls._guard:
            if cls._instance is None:
                cls._instance = cls(worker)
            else:
                cls._instance.worker = worker
            return cls._instance

    def enqueue(self, assignment_id: int) -> bool:
        if assignment_id in self._in_queue:
            self._rerun.add(assignment_id)
            print(f"[AI][QUEUE] already queued: {assignment_id} -> mark rerun", flush=True)
            return False
        self._in_queue.add(assignment_id)
        self._status[assignment_id] = JobStatus(state="queued", message="queued", updated_at=time.time())
        self._q.put(assignment_id)
        print(f"[AI][QUEUE] put job: {assignment_id}", flush=True)
        return True

    def _loop(self):
        while True:
            aid = self._q.get()
            st = self._status.get(aid) or JobStatus()
            st.state = "running"; st.progress = 0.0; st.message = "starting"; st.updated_at = time.time()
            self._status[aid] = st
            proxy = StatusProxy(st, lambda: self._touch(aid))
            try:
                self.worker(aid, proxy)
                st.state = "done"; st.progress = 1.0; st.message = "done"; st.updated_at = time.time()
            except Exception:
                st.state = "error"
                st.error = traceback.format_exc()
                st.message = "failed"
                st.updated_at = time.time()
            finally:
                if aid in self._rerun:
                    self._rerun.discard(aid)
                    self._q.put(aid)
                    print(f"[AI][QUEUE] rerun scheduled: {aid}", flush=True)
                else:
                    self._in_queue.discard(aid)
                    print(f"[AI][QUEUE] finish job: {aid}, state={st.state}", flush=True)
                self._status[aid] = st
                self._q.task_done()

    def _touch(self, aid: int):
        st = self._status.get(aid)
        if st:
            st.updated_at = time.time()

    def get_status(self, aid: int) -> Optional[JobStatus]:
        return self._status.get(aid)

    def list_status(self) -> Dict[int, JobStatus]:
        return self._status
