# Capstone Project – AI Assisted Marking Platform

This repository contains the full-stack AI Assisted Marking application used for UNSW COMP3900/COMP9900 projects. It is organised as a mono-repo with dedicated documentation in each subfolder.

## Project Background

Qualitative assessments in large courses often face challenges of inconsistency, with markers applying varying levels of leniency or harshness that create student dissatisfaction, inequity, and extra moderation work for coordinators. This project addresses those issues by building an AI-assisted moderation system that leverages exemplar coordinator assessments and historical best practices to generate clear marking guidelines, benchmark demonstrators, and produce moderation reports that reduce manual adjustments. The long-term intent is to improve equity for students, provide staff with transparent tooling, and offer structured training resources for new demonstrators.

## Project Scope

The scoped deliverable is a prototype AI-assisted moderation platform tailored to qualitative assessments in large courses with multiple markers. It is trained on coordinator-marked exemplars from CVEN9723, CVEN9513, and CVEN9051, anonymising student data to uphold compliance, and focuses on: (1) generating structured guidelines, (2) benchmarking demonstrator performance against coordinator expectations, and (3) producing transparent moderation reports that highlight consistency patterns. The pilot targets a small cohort of demonstrators with training on how to interpret AI outputs. Key deliverables include the deployed AI Assisted Marking stack (FastAPI backend + React console wired to the AI pipelines and job queue), the moderation frameworks encoded in the repository, pilot evaluation reports derived from AI Assisted Marking’s dashboards/logs, and dissemination artefacts—laying the groundwork for future school-wide adoption and deeper integration with UNSW-supported platforms.

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
- `cake-frontend`: React dev server on `localhost:3000` pointing to the backend (`REACT_APP_API_BASE_URL=http://localhost:8000`; set this in `frontend/.env` when running outside Docker).

See `docker-compose.yml` for details. Use `docker compose down` to stop, and `docker compose logs -f backend` (or `frontend`) to inspect service output.

## Repository Layout

| Path        | Description | Docs |
|-------------|-------------|------|
| `backend/`  | FastAPI service, AI job queue, database models, routers, and pytest suite. | [backend/README.md](backend/README.md) |
| `frontend/` | React (CRA) SPA for coordinators/tutors, powered by MUI and React Router. | [frontend/README.md](frontend/README.md) |
| `AI/`       | Supporting AI scripts, pipelines, and configuration used by the backend worker. | [AI/README.md](AI/README.md) |
| `docs/`     | Additional artefacts (testing recording, client and lab recordings, design notes, diagrams, etc.). | (See files inside `docs/`) |


### Backend at a Glance
- `app/main.py` bootstraps the FastAPI app, enabling middleware, dependency overrides, and `/v1/**` routers housed in `app/routers/` (auth, courses, assignments, submissions, marking_result, ai, logs).
- Persistence lives in `app/models.py` + `app/db.py` (SQLAlchemy models, session helpers); refer to `backend/README.md` for the ER diagram and state machines like `submission_status`.
- AI orchestration happens in `app/services/ai_job_queue.py` and `app/services/ai_runner.py`, which enqueue rubric/prediction runs, persist job metadata, and expose status endpoints polled by the frontend.
- `app/utils/` centralises helpers (paths, job queue accessor, submission status), while `backend/tests/` contains the pytest suite you extend when adding routers/services.
- Tooling: Poetry environment + scripts, Black/isort/Bandit/pip-audit wired via GitHub Actions; run the same locally with `poetry run <tool>` before opening PRs.
- Testing commands: `poetry run pytest --cov=app --cov-report=xml` for the suite, plus targeted helpers such as `poetry run pytest tests/test_submission_status.py` when iterating on specific utilities.

### Frontend at a Glance
- CRA/React 19 application structured under `src/` with router definitions in `src/routes.jsx` (guards `<Private>` and `<PublicOnly>`) backed by the auth context in `src/context/auth-context.jsx`.
- `src/api.js` is the single client for backend calls (auth, courses, assignments, submissions, marking results, system logs); it injects auth headers and toggles JSON/FormData usage.
- Page-level flows sit in `src/pages/`: `courses.jsx` (dashboard/actions), `fileupload.jsx` (seven-step wizard), `airesult.jsx` (dashboard + review tab), and `admin-logs.jsx` (system logs). Shared widgets live in `src/component/`.
- UI composition relies on MUI 7, MUI X DataGrid/Charts, Sonner notifications, and custom context-aware dialogs; styling follows the patterns documented in `frontend/README.md`.
- Testing uses React Testing Library with suites co-located next to components (e.g., `src/component/CourseDialogs.test.jsx`, `CourseActionDialog.test.jsx`, `DashboardStudent.test.jsx`—the last requires `TextEncoder/TextDecoder` polyfills); run all suites with `npm test` (press `a` in watch mode) or filter a specific file via `npm test -- <test-file>.jsx`.


### AI Module at a Glance
- AutoGrade pairs a DNN scorer with an LLM prompt chain to generate rubric-aware marks, then fuses the outputs to create calibrated predictions + textual feedback for the backend to ingest.
- `main.py --o {0,1,2,all}` runs rubric creation, teacher-pattern learning, scoring, or the full pipeline; individual helpers live under `AI/scripts/` for step-by-step debugging.
- Directory highlights:
  - `data/` (raw requirements, tutor-marked exemplars, held-out test submissions) feeds both learning stages.
  - `artifacts/rubric` stores generated rubric JSONs and teacher summaries; `artifacts/prediction` exposes final `assignments_score.json` consumed by the backend sync.
  - `src/` contains preprocessing utilities, prompt templates, retrievers, the LLM client, and scoring/fusion logic.
- See `AI/README.md` for environment setup (conda env, `OPENAI_API_KEY`) plus deeper notes on configuration, scripts, and expected outputs.


## Contributing

1. Create a feature branch.
2. Update relevant folder README(s) when behaviour changes.
3. Run backend + frontend tests locally.
4. Open a PR, ensuring CI is green.

For deeper subsystem information (database schema, UI flows, AI tooling), refer to the README in each folder linked above.
