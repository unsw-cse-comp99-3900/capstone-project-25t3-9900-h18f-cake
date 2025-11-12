# CAKE Frontend

React single-page application used by coordinators and tutors to manage courses, ingest assignment artefacts, run AI-assisted marking, and reconcile tutor marks. The UI talks to the FastAPI backend via `/v1/**` endpoints.

---

## Stack Overview

| Layer         | Tooling / Notes                                                                   |
|---------------|-----------------------------------------------------------------------------------|
| Framework     | React 19 (Create React App)                                                       |
| UI kit        | MUI 7 + MUI X (DataGrid, Charts)                                                  |
| Routing       | React Router DOM 7 with `<Private>` / `<PublicOnly>` guards                       |
| State/Auth    | React Context (`AuthProvider`) storing JWT in `localStorage`                      |
| Notifications | Sonner                                                                            |
| API wrapper   | `src/api.js` centralises `fetch` + auth headers                                   |

---

## Prerequisites & Setup

1. Install Node.js ≥ 18.
2. Run the backend on a reachable host/port.
3. Create `frontend/.env`:

   ```bash
   REACT_APP_API_BASE_URL=http://127.0.0.1:8000
   ```

4. Install/run:

   ```bash
   cd frontend
   npm install
   npm start        # http://localhost:3000
   ```

5. Build for production:

   ```bash
   npm run build
   ```

Scripts: `npm start`, `npm test`, `npm run build`, `npm run eject`.

---

## Directory Layout

```
frontend/
├── public/               # CRA static assets
└── src/
    ├── api.js            # REST helper (auth, courses, assignments, submissions, logs, etc.)
    ├── component/        # Reusable UI (dashboards, dialogs, upload widgets, sidebar)
    ├── context/
    │   └── auth-context.jsx
    ├── pages/            # Route-level screens
    ├── routes.jsx        # Router + guards + global <Toaster>
    └── index.js          # App bootstrap
```

---

## Routing

`src/routes.jsx` guards routes with `Private` (requires token) and `PublicOnly` (redirects authenticated users to `/courses`).

| Path          | Screen                 | Guard      | Purpose                                  |
|---------------|------------------------|------------|------------------------------------------|
| `/`           | `LoginMain`            | PublicOnly | Sign in                                  |
| `/register`   | `RegisterMain`         | PublicOnly | Account creation                         |
| `/courses`    | `CoursesPage`          | Private    | Course dashboard + actions               |
| `/fileupload` | `FileUpload`           | Private    | Assignment artefact wizard               |
| `/airesult`   | `Airesult`             | Private    | Dashboards + review workflow             |
| `/admin/logs` | `AdminLogsPage`        | Private    | System log viewer (menu shortcut on `/courses`) |

---

## Feature Highlights

### Courses (`pages/course.jsx`)

- Lists courses grouped by term.
- Floating header icons (add/delete/logout/logs) mirror the system log page styling.
- `CourseAdd`, `CourseDelete`, and `CourseActionDialog` trigger CRUD calls through `API.courses`.
- Action dialog polls `/v1/marking_result/{courseId}/status` so “View AI Results” only opens once AI completes.

### Assignment Upload (`pages/fileupload.jsx`)

Wizard steps:

1. Assignment metadata + specification.
2. Rubric upload.
3. Coordinator submissions.
4. Coordinator score attachments.
5. Tutor submissions.
6. Tutor scores.
7. Review + confirmation.

Files are validated (PDF/Word), grouped by zID, and sent through `API.assignments` / `API.submissions`. Progress is shown via the stepper component.

### AI Results (`pages/airesult.jsx`)

- Polls `/status` until `ai_completed` is true, then fetches records via `API.markingResults.byCourseId`.
- Top bar houses back button, dashboard/review toggle, logout, and (if needed) system log shortcut.
- **Dashboard tab**:
  - Filters by assignment and tutor.
  - `DashboardStudent` DataGrid with:
    - Tutor vs AI marks, difference, bullet-point AI justification (pre-line formatting), inline review edit support.
    - Final mark column (review mark fallback to tutor mark).
    - Checkbox selection + CSV export (includes final mark).
  - `DashboardTutorScatter` shows headline metrics, scatter plot, and tutor snapshot table.
- **Review tab**:
  - `ReviewDashboard` surfaces items needing review, validates revised marks/comments, and saves via `API.markingResults.upsert`.
  - Toast feedback on success/failure.

### System Logs (`pages/admin-logs.jsx`)

- Displays backend events such as assignment uploads, AI marking completion, and mark review completion.
- Header mirrors the courses page with large back + logout icons.
- Filters by level/action substring; exports to CSV.
- Timestamps are shown in Sydney time (AEST/AEDT).
- Actions are humanised (“AI Marking Success”, “Mark Review Success”, etc.).

---

## API Client (`src/api.js`)

Namespaced helpers:

- `auth`: `register`, `login` (stores token), `logout`.
- `courses`: `list`, `create`, `remove`.
- `assignments`: `createWithFiles`, `updateFiles`.
- `submissions`: `bulkUpload`, `appendFiles`, `create`.
- `markingResults`: `byCourseId`, `upsert`, `status`, `setStatus`.
- `systemLogs`: `list`.
- `health`: `ping`.

Requests automatically include `Authorization: Bearer <token>` and JSON headers unless sending `FormData`.

---

## Development Tips

- Run backend + frontend together; the UI redirects to `/` if API calls 401.
- When adding new dashboards or exports, keep DataGrid column changes in sync with any CSV formatter (see `airesult.jsx` and `admin-logs.jsx`).
- For multiline text (feedback, metadata), use `whiteSpace: "pre-line"` so AI justification formatting is preserved.
- Use `useAuth()` only inside children of `<AuthProvider>` (already wrapped at router level).
- System logs rely on backend instrumentation; check `/v1/system_logs` if the UI shows empty data.

---

## Troubleshooting

| Issue                               | Fix                                                                 |
|-------------------------------------|----------------------------------------------------------------------|
| Continuous redirect to `/`          | Token missing/expired. Re-login or confirm backend token issuance.  |
| CORS failures                       | Run `npm start` (proxy) or configure backend CORS for `localhost`.  |
| Upload rejected                     | Ensure files are PDF/Word, filenames include `zID`, and steps are correct. |
| AI results button disabled          | Backend hasn’t completed AI run. Check `/v1/marking_result/{id}/status`. |
| System logs missing entries         | Backend not instrumented? Ensure upload/AI/review endpoints fired.  |

---

## Testing

Run the component/unit tests with React Testing Library:

```bash
cd frontend
npm test -- --watch=false --coverage
```

Initial coverage focuses on core navigation components (e.g., the sidebar buttons render as expected and fire the correct callbacks). As you add new features, create companion tests under `src/**/*.test.jsx` that exercise rendering logic, user interactions (`@testing-library/user-event`), and error states. Document any manual or end-to-end scenarios that cannot be automated yet.

---

## Contributing

1. Create a branch.
2. Make changes (prefer `src/component` for shared UI).
3. Update this README or inline docs when behaviour changes.
4. Submit PR with relevant screenshots/tests.

Happy coordinating! 🧁
