# Capstone Project – CAKE Platform

This repository contains the full-stack CAKE application used for UNSW COMP3900/COMP9900 projects. It is organised as a mono-repo with dedicated documentation in each subfolder.

## Repository Layout

| Path        | Description | Docs |
|-------------|-------------|------|
| `backend/`  | FastAPI service, AI job queue, database models, routers, and pytest suite. | [backend/README.md](backend/README.md) |
| `frontend/` | React (CRA) SPA for coordinators/tutors, powered by MUI and React Router. | [frontend/README.md](frontend/README.md) |
| `AI/`       | Supporting AI scripts, pipelines, and configuration used by the backend worker. | [AI/README.md](AI/README.md) |
| `docs/`     | Additional artefacts (testing recording, client and lab recordings, design notes, diagrams, etc.). | (See files inside `docs/`) |

### Backend at a Glance
- FastAPI app with SQLAlchemy models for courses, assignments, submissions, and system logs (see ER diagram in `backend/README.md`).
- AI job queue (`app/services/ai_job_queue.py`) orchestrates rubric init and prediction pipelines while surfacing status endpoints.
- Security checks (`pip-audit`, `bandit`) plus formatters (Black, isort) run via GitHub Actions.
- Tests: Pytest modules under `backend/tests/` currently cover `compute_status` and tutor-mark helpers; extend with FastAPI `TestClient` suites as you add routes.
- Commands:
  ```bash
  cd backend
  poetry install --all-extras --with dev
  poetry run uvicorn app.main:app --reload
  poetry run pytest --cov=app --cov-report=xml
  ```

### Frontend at a Glance
- React 19 + CRA with MUI 7 components, Sonner notifications, React Router guards, and a central API client (`src/api.js`).
- Key flows documented in `frontend/README.md`: course dashboard, multi-step upload wizard, AI results dashboards, system log viewer.
- Testing uses React Testing Library (`npm test -- --watch=false --coverage`). Example suite `src/component/CourseDialogs.test.jsx` covers course add/delete dialogs; follow the same pattern for other components/interactions.
- Scripts:
  ```bash
  cd frontend
  npm install
  npm start            # dev server
  npm test -- --watch=false --coverage
  npm run build
  ```

### AI Module at a Glance
- `AI/README.md` documents the AutoGrade pipeline that blends DNN-trained scoring with rubric-guided LLM evaluations plus calibration.
- Structure highlights:
  - `scripts/` (`config.py`, `rubric_assign_req.py`, `teacher_rubric_learning.py`, `predict_scores.py`) provide step-by-step orchestration.
  - `artifacts/` holds generated rubrics and prediction outputs; `data/` stores raw/test/marked submissions.
  - `src/` contains preprocessing, rubric retrievers, LLM client, and scorer implementations.
- Setup (per AI README):
  ```bash
  cd AI
  conda create -n 9900 python=3.9
  conda activate 9900
  pip install -r requirements.txt
  export OPENAI_API_KEY="sk-..."
  python main.py --o all   # or 0/1/2 for specific steps
  ```

## Quick Start

### Docker (recommended for full stack)

```bash
docker compose up --build
```

Useful commands:

```bash
docker compose up -d             # start in background
docker compose logs -f backend   # tail backend logs
docker compose logs -f frontend  # tail frontend logs
docker compose down              # stop & remove containers
```

This spins up:

- `cake-backend`: Poetry-driven FastAPI server exposed on `localhost:8000` (env vars from `backend/.env`, volumes mounted for live reload).
- `cake-frontend`: React dev server on `localhost:3000` pointing to the backend (`REACT_APP_API_BASE_URL=http://localhost:8000`).

See `docker-compose.yml` for details. Use `docker compose down` to stop, and `docker compose logs -f backend` (or `frontend`) to inspect service output.

### Manual workflow (without Docker)

1. **Backend**
   ```bash
   cd backend
   poetry install --all-extras --with dev
   poetry run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```
   More details: [backend/README.md](backend/README.md)

2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   More details: [frontend/README.md](frontend/README.md)

3. **AI scripts** – follow the instructions in [AI/README.md](AI/README.md) to configure models, GPU/CPU requirements, and dataset locations.

## Testing & CI

- Backend: `poetry run pytest --cov=app --cov-report=xml`. See backend README for coverage targets and current suites.
- Frontend: `npm test -- --watch=false --coverage`. Component tests live beside their components.
- GitHub Actions pipeline runs both jobs plus linting (Black/isort), Bandit, pip-audit, and npm audit. See `.github/workflows/ci.yml`.

## Contributing

1. Create a feature branch.
2. Update relevant folder README(s) when behaviour changes.
3. Run backend + frontend tests locally.
4. Open a PR, ensuring CI is green.

For deeper subsystem information (database schema, UI flows, AI tooling), refer to the README in each folder linked above.
