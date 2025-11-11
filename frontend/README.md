# CAKE Frontend

React + MUI single-page app for coordinators to manage courses, upload assignment artefacts, and review AI-assisted marking results. The UI talks to the FastAPI backend via REST endpoints exposed under `/v1/*`.

## Tech Stack
- React 19 with Create React App tooling (`react-scripts`)
- React Router DOM 7 for routing + guards
- MUI 7 & MUI X (Data Grid, Charts) for the design system
- Sonner for toast notifications
- Native `fetch` wrapper in `src/api.js` that injects the bearer token stored in `localStorage`

## Environment & Configuration
Create `frontend/.env` (not committed) to point the UI at the correct API origin:

```bash
REACT_APP_API_BASE_URL=http://127.0.0.1:8000
```

- The value is trimmed of trailing slashes and used for every request in `src/api.js`.
- During development the CRA `proxy` (configured in `package.json`) also forwards unknown requests to `http://127.0.0.1:8000`, so either the proxy or the explicit env var can be used.
- Tokens are persisted under the `token` key in `localStorage`. `useAuth` exposes `login`, `register`, and `logout` helpers, so never manipulate the key directly in components.

## Getting Started
1. Install Node.js ≥ 18 (LTS recommended) and npm.
2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Ensure the backend is running on the host/port that matches `REACT_APP_API_BASE_URL` (or CRA `proxy`).
4. Start the dev server:
   ```bash
   npm start
   ```
   The app opens on `http://localhost:3000` with hot reload enabled and API calls forwarded to the backend.
5. Production build (for Docker/CI) is created with:
   ```bash
   npm run build
   ```

## Available Scripts
- `npm start` – CRA dev server with hot module reload.
- `npm test` – Jest + React Testing Library in watch mode.
- `npm run build` – Production bundle in `frontend/build`.
- `npm run eject` – Expose CRA configuration (one-way; only if you need to customise the build pipeline).

## Directory Layout
```
frontend/
├── public/              # Static assets served by CRA
└── src/
    ├── api.js           # Central fetch wrapper + resource-specific helpers
    ├── component/       # Reusable UI blocks (cards, dialogs, dashboards, steppers, etc.)
    ├── context/
    │   └── auth-context.jsx  # Authentication provider and hook
    ├── pages/           # Route-level screens
    ├── routes.jsx       # Router + guards + global <Toaster />
    └── index.js         # App entry that mounts BrowserRouter
```

## Routing & Guards
`src/routes.jsx` wires `react-router-dom` routes:
- `/` – `LoginMain`, wrapped in `PublicOnly` to redirect authenticated users to `/courses`.
- `/register` – registration form, also `PublicOnly`.
- `/courses` – course dashboard, wrapped in `Private`.
- `/fileupload` – multi-step assignment workflow (requires token).
- `/airesult` – AI insights & review workspace (requires token).
- Unknown paths redirect to `/`.
The `AuthProvider` (in both `index.js` and `routes.jsx`) ensures `useAuth()` is available everywhere for login state, error reporting, and logout.

## Feature Walkthrough
### Authentication
- `context/auth-context.jsx` keeps the bearer token in state, rehydrates from `localStorage`, and exposes `login`, `register`, and `logout`.
- `api.auth.login` writes the token, `logout` clears it and resets error state.
- Honor the hook contract by wrapping new components with `<AuthProvider>` before calling `useAuth()`.

### Course Management (`pages/course.jsx`)
- Fetches `/v1/courses/` on load and groups them by term for display.
- Actions:
  - **Add course** – `CourseAdd` dialog validates inputs, normalises term (`2024 Term 1`), and POSTs via `API.courses.create`.
  - **Delete course** – `CourseDelete` confirmation, then `API.courses.remove`.
  - **Course action dialog** – `CourseActionDialog` lets the user upload assignments or view AI results. It polls `/v1/marking_result/<courseId>/status` to decide whether "View AI-generated grades" is enabled.
  - **Logout** – `ExitConfirmPopup` to avoid accidental session termination.

### Multi-step Assignment Upload (`pages/fileupload.jsx`)
Workflow for coordinators to seed assignments and upload marking artefacts:
1. **Assignment info** – upload specification PDF + assignment name.
2. **Marking guidelines** – upload rubric PDF. After step 2 the UI calls `API.assignments.createWithFiles`, persisting the new assignment and storing its `id`.
3. **Coordinator-marked submissions** – bulk upload student submissions. Files are grouped by `zID` extracted from filenames and sent to `API.submissions.bulkUpload`.
4. **Coordinator score uploads** – attaches score files (`appendFiles` with step index 4) to existing submissions.
5. **Tutor-marked submissions** – attaches or creates submissions per student for tutor artefacts (step index 5).
6. **Tutor score uploads** – appends score files for tutors (step index 6).
7. **Review** – summarises every step before final submission.
All steps enforce guardrails (PDF requirement for steps 1–2, zID detection for later steps) and surface errors with Sonner toasts.

### AI Result Review (`pages/airesult.jsx`)
- Displays dashboards once `API.markingResults.status` reports `ai_completed=true`.
- `Sidebar` toggles between:
  - **Dashboard** – `DashboardStudent` (MUI DataGrid) compares tutor vs AI marks and surfaces AI-generated feedback; `DashboardTutorScatter` plots tutor vs AI scores per tutor.
  - **Review** – `ReviewDashboard` filters submissions with `needsReview`, allows revising marks/comments, and persists them through `API.markingResults.upsert`.
- Global top bar provides course context, back navigation, and logout confirmation.

### Reusable Components
- `component/course-card.jsx`, `course-add.jsx`, `course-delete.jsx`, `course-action.jsx` – card/list management for courses.
- `component/upload-box.jsx`, `upload-stepper.jsx`, `upload-stepper.jsx` – drag-and-drop upload UI plus progress indicator.
- `component/dashboard-*` – analytical widgets for AI insight visualisation.
- `component/exit-confirm.jsx` – confirmation dialog reused across logout scenarios.

### API Helper (`src/api.js`)
Centralised wrapper around `fetch`:
- Automatically injects `Content-Type` and `Authorization` headers unless a `FormData` body is used.
- Normalises JSON/string responses and raises friendly errors.
- Namespaced helpers:
  - `auth`: `login`, `register`, `logout`
  - `courses`: `list`, `create`, `remove`
  - `assignments`: `list`, `createWithFiles`, `updateFiles`
  - `submissions`: `bulkUpload`, `appendFiles`, `create`
  - `markingResults`: `status`, `setStatus`, `upsert`, `byCourseId`
  - `health.ping`
Add new endpoints here so components stay declarative and token handling remains centralised.

## Development Tips
- Use `npm start` with the backend running so API calls succeed; the UI will redirect to `/` if `useAuth()` no longer sees a token.
- When adding new screens, register them in `src/routes.jsx` and wrap them with `Private/PublicOnly` as appropriate.
- Prefer the components in `src/component` over reimplementing modals, cards, or uploaders for visual consistency.
- The UI expects filenames to contain a `zID` (e.g. `z1234567_assignment.pdf`) when attaching coordinator/tutor artefacts so it can map them to submissions.

## Troubleshooting
- **401 Unauthorized / redirect loop** – ensure the backend issues a valid token and `REACT_APP_API_BASE_URL` points to the correct origin.
- **CORS errors** – run through the CRA dev server (`npm start`) or configure the backend to allow the frontend origin.
- **Uploads fail silently** – check browser console for Sonner error toasts and verify filenames include `zID` and PDFs are provided where required.
- **AI results button disabled** – the backend has not finished processing; check `/v1/marking_result/<courseId>/status` or wait for the poller to flip `ai_completed` to `true`.

This README now reflects the actual frontend structure so new contributors can understand how to configure, run, and extend the UI quickly.
