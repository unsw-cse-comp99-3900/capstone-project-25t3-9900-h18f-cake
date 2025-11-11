from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    courses,
    assignments,
    submissions,
    marking_result_manage,
    extract_infomation,
    ai_router,
    system_logs,
)
from app.db import Base, engine
from app import models  # noqa: F401  (ensures models are registered)
from app.logging import configure_logging
from app.middleware import RequestLoggingMiddleware

app = FastAPI(title="Grader Backend (Poetry + AI)", version="1.0.0")
configure_logging()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(assignments.router)
app.include_router(submissions.router)
app.include_router(marking_result_manage.router)
app.include_router(system_logs.router)

app.include_router(extract_infomation.router)


app.include_router(ai_router.router)  

@app.get("/health")
def health():
    return {"ok": True}
