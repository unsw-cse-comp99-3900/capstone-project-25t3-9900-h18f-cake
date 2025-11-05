[![Open in Visual Studio Code](https://classroom.github.com/assets/open-in-vscode-2e0aaae1b6195c2367325f4f02e2d04e9abb55f0b24a779b69b11b9e10269abc.svg)](https://classroom.github.com/online_ide?assignment_repo_id=20528448&assignment_repo_type=AssignmentRepo)

backend activate command: poetry run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

### ER Diagram

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