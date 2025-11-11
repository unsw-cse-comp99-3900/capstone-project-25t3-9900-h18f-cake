# CAKE Frontend

Single-page React application used by course coordinators and tutors to upload assignment artefacts, orchestrate AI-assisted marking, and reconcile tutor marks. The UI consumes the FastAPI backend via the REST endpoints exposed under `/v1/**`.

---

## Tech Stack

| Area            | Tooling                                                                           |
|-----------------|------------------------------------------------------------------------------------|
| Framework       | React 19 (Create React App tooling)                                                |
| UI Kit          | MUI 7 + MUI X (DataGrid, Charts)                                                   |
| Routing         | React Router DOM 7                                                                 |
| Notifications   | Sonner                                                                             |
| State/Context   | React Context (custom `AuthProvider`)                                              |
| Auth            | JWT stored in `localStorage`, injected by `src/api.js` wrapper                     |

---

## Prerequisites

1. Node.js ≥ 18 (LTS recommended).
2. Running backend (FastAPI) that the UI can target.
3. `.env` file in `frontend/` to point the UI at the backend:

```bash
REACT_APP_API_BASE_URL=http://127.0.0.1:8000
```

`src/api.js` trims trailing slashes, so provide only the origin. If the `.env` variable is missing, CRA’s `proxy` (see `package.json`) forwards unknown requests to the backend.

---

## Getting Started

```bash
cd frontend
npm install          # install deps
npm start            # dev server on http://localhost:3000
```

The dev server hot-reloads React components and proxies API calls to the backend. To create a production build:

```bash
npm run build        # outputs to frontend/build
```

Available scripts:

- `npm start` – CRA dev server with hot reload.
- `npm test` – Jest + React Testing Library in watch mode.
- `npm run build` – Production bundle (minified).
- `npm run eject` – Exposes CRA config (one-way).

---

## Directory Layout

```
frontend/
├── public/                    # Static assets served by CRA
└── src/
    ├── api.js                 # Centralised fetch wrapper, grouped endpoints
    ├── component/             # Reusable UI pieces (dashboards, dialogs, upload widgets)
    ├── context/
    │   └── auth-context.jsx   # Auth provider, login/register/logout helpers
    ├── pages/                 # Route-level screens (course list, upload flow, AI results, etc.)
    ├── routes.jsx             # Router + guards + global toaster
    └── index.js               # App entry point (mounts BrowserRouter + AuthProvider)
```

Use `component/` for anything shared across pages (e.g., `dashboard-1-main.jsx`, `course-card.jsx`, `exit-confirm.jsx`). Route-level logic lives under `pages/`.

---

## Routing & Guards

`src/routes.jsx` configures React Router with two guard components:

- `<Private>` – requires an auth token; redirects unauthenticated users to `/`.
- `<PublicOnly>` – blocks authenticated users from visiting login/register pages.

Current routes:

| Path        | Component            | Guard      | Notes                                     |
|-------------|----------------------|------------|-------------------------------------------|
| `/`         | `LoginMain`          | PublicOnly | Displays login form                       |
| `/register` | `Register`           | PublicOnly | User registration                         |
| `/courses`  | `CoursePage`         | Private    | Course dashboard with CRUD actions        |
| `/fileupload` | `FileUpload`       | Private    | Multi-step assignment + artefact uploader |
| `/airesult` | `Airesult`           | Private    | AI dashboards + review workflow           |

Unknown paths are redirected to `/`.

`AuthProvider` (in `context/auth-context.jsx`) keeps the JWT in memory + `localStorage` and exposes `login`, `register`, `logout`, and `token`. Always wrap components that call `useAuth()` with `<AuthProvider>`.

---

## Key Features

### Course Management (`pages/course.jsx`)

- Lists courses grouped by term.
- `CourseAdd` dialog validates course code/name/term and POSTs via `API.courses.create`.
- `CourseDelete` handles confirmation before `API.courses.remove`.
- `CourseActionDialog` lets coordinators upload artefacts or open AI results; polls `/v1/marking_result/{courseId}/status` to determine if AI dashboards are ready.
- `ExitConfirmPopup` ensures deliberate logout.

### Assignment / Artefact Upload Flow (`pages/fileupload.jsx`)

Wizard-driven workflow:

1. Assignment info – upload spec PDF + metadata.
2. Rubric upload – PDF guidelines.
3. Coordinator submissions – bulk upload, grouping files by zID extracted from filenames.
4. Coordinator scores – append evaluation spreadsheets.
5. Tutor submissions – attach tutor artefacts (new or existing submissions).
6. Tutor scores – append tutor score sheets.
7. Review – summarises all metadata before finalising.

Each step enforces required file types, uses drag-and-drop upload widgets, and persists via `API.assignments` / `API.submissions`.

### AI Result Workspace (`pages/airesult.jsx`)

- Polls `/v1/marking_result/{courseId}/status` until `ai_completed` is true, then fetches all results via `API.markingResults.byCourseId`.
- Top bar exposes course name/term plus navigation (back to courses, dashboard/review toggles, logout).
- **Dashboard tab**
  - Filters for assignments/tutors.
  - `DashboardStudent` (DataGrid) lists each row with tutor mark, AI mark, automatic difference calculation, bullet-point AI justification, review state, and revised feedback. Includes checkbox selection + CSV export (with “Final Mark” column).
  - `DashboardTutorScatter` shows summary cards (scripts processed, average tutor/AI/final marks, variance count) plus a scatter plot comparing AI vs tutor marks and a tutor snapshot table.
- **Review tab**
  - `ReviewDashboard` surfaces submissions needing review, letting coordinators input revised marks/comments. Saves via `API.markingResults.upsert`, updates progress, and shows toast feedback.

### Shared Components

- `dashboard-1-main.jsx` – configurable DataGrid with selection + inline edit support.
- `dashboard-2-tutor-scatter.jsx` – analytics panel combining scatter chart with tutor stats.
- `course-*` components – card rendering + modals for course CRUD.
- `upload-box.jsx`, `upload-stepper.jsx` – drag-and-drop file uploader with progress indicator.
- `exit-confirm.jsx` – reusable confirmation dialog for logout.

---

## API Wrapper (`src/api.js`)

Centralises `fetch` logic with automatic header injection and error handling. Endpoint groups:

- `auth` – `login`, `register`
- `courses` – `list`, `create`, `remove`
- `assignments` – `createWithFiles`, `updateFiles`
- `submissions` – `bulkUpload`, `appendFiles`
- `markingResults` – `status`, `setStatus`, `byCourseId`, `upsert`
- `health` – `ping`

Every request uses the base URL from `REACT_APP_API_BASE_URL`. File uploads use `FormData` and skip the JSON `Content-Type` header automatically.

---

## Development Tips

- Keep the backend running while developing; otherwise `useAuth()` will redirect to `/` due to failed API calls.
- Add new routes in `src/routes.jsx` and wrap them with the appropriate guard.
- Prefer components in `src/component` for consistent styling.
- When displaying AI feedback or multiline text, use `whiteSpace: "pre-line"` so newline formatting is preserved (see `dashboard-1-main.jsx`).
- CSV exports use `handleDownloadCsv` in `airesult.jsx`; update that function whenever table columns change.

---

## Troubleshooting

| Problem                         | Likely Cause / Fix                                                                                  |
|---------------------------------|------------------------------------------------------------------------------------------------------|
| Redirect loop to `/`           | Token missing/expired. Confirm backend login works and `REACT_APP_API_BASE_URL` is correct.          |
| CORS errors                    | Run `npm start` (uses CRA proxy) or configure backend CORS to allow `http://localhost:3000`.         |
| File uploads rejected          | Ensure filenames contain a `zID` (e.g., `z1234567_report.pdf`) and required PDFs are supplied.        |
| “AI results” button disabled   | Backend has not finished processing; watch `/v1/marking_result/{courseId}/status` for `ai_completed`. |
| Charts not rendering           | Required data arrays empty; confirm backend returned `marking_results` and AI processing is done.     |

---
