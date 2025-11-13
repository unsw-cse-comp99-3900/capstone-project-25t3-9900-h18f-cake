[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=20528448&assignment_repo_type=AssignmentRepo)

# Backend (FastAPI + SQLAlchemy)

FastAPI service powering the CAKE platform. It exposes `/v1/**` routers for authentication, courses, submissions, AI orchestration, and system logs. The codebase is structured as follows:

| Directory/File | Purpose |
|----------------|---------|
| `app/main.py` | FastAPI entry point, middleware, router registration. |
| `app/models.py` | SQLAlchemy ORM definitions (Users, Courses, Assignments, Submissions, SubmissionFiles, SystemLogs). |
| `app/db.py` | Engine/session setup, Alembic readiness. |
| `app/routers/` | Modular route handlers (auth, submissions, marking_result, AI, logs, etc.). |
| `app/services/` | Job queue, AI runner, marking sync, system log helpers. |
| `app/utils/` | Shared helpers (paths, job queue accessor, submission status). |
| `tests/` | Pytest suites (unit + future integration tests). |

## Data Model

```mermaid
erDiagram
  USERS ||--o{ COURSES : owns
  COURSES ||--o{ ASSIGNMENTS : has
  ASSIGNMENTS ||--o{ SUBMISSIONS : receives
  SUBMISSIONS ||--o{ SUBMISSION_FILES : contains
  USERS ||--o{ SUBMISSIONS : created_by
  USERS ||--o{ SUBMISSION_FILES : uploaded_by

  USERS {
    int id PK
    string email UK
    string password_hash
    string role
    date created_at
  }

  COURSES {
    int id PK
    string code
    string name
    string term
    int owner_id FK
  }

  ASSIGNMENTS {
    int id PK
    int course_id FK
    string title
    string rubric_json
    string spec_url
    string meta_json
  }

  SUBMISSIONS {
    int id PK
    int assignment_id FK
    string assignment_name
    string course
    string term
    int created_by FK
    string status
    string student_id
    date created_at
    date updated_at
  }

  SUBMISSION_FILES {
    int id PK
    int submission_id FK
    int step_index
    string actor_role
    string part_kind
    string filename
    string path
    string mime
    int size
    int uploaded_by FK
    date uploaded_at
  }

  %% Notes:
  %% - status: DRAFT | WAIT_COORDINATOR | WAIT_TUTOR | READY_FOR_REVIEW | COMPLETED
  %% - actor_role: COORDINATOR | TUTOR
  %% - part_kind: ASSIGNMENT | SCORE
```

## Getting Started

```bash
cd backend
poetry install --all-extras --with dev   # dependencies (app + dev tools)

# run API
poetry run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Environment variables (example `.env`):

```
DATABASE_URL=sqlite:///app.db
JWT_SECRET=super-secret
OPENAI_API_KEY=sk-...
```

## Testing

```bash
cd backend
poetry run pytest --cov=app --cov-report=xml
```

Quick targeted runs:

```bash
poetry run pytest tests/test_submission_status.py
poetry run pytest tests/test_marking_sync_utils.py
```

Current automated coverage:

- `app.utils.submission_status.compute_status` (all states).
- `app.services.marking_sync` helpers for scoring normalization.

Add future tests under `backend/tests/`, preferring:

- Pure unit tests for utilities.
- FastAPI `TestClient` suites for routers/services.
- Job-queue/AI flow tests that mock external AI scripts when needed.

## Tooling

- **Formatting**: `poetry run black app`, `poetry run isort app`
- **Security**: `poetry run bandit -q -r app`, `pip-audit`
- **Env**: Python ≥3.12 (matches CI), Poetry ≥1.8

Keep this file updated as new modules, scripts, or testing strategies are added.
