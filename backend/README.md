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
      INT id PK
      STRING email UNIQUE
      STRING password_hash
      STRING role
      DATETIME created_at
    }

    COURSES {
      INT id PK
      STRING code
      STRING name
      STRING term
      INT owner_id FK
    }

    ASSIGNMENTS {
      INT id PK
      INT course_id FK
      STRING title
      TEXT rubric_json
      TEXT spec_url
      TEXT meta_json
    }

    SUBMISSIONS {
      INT id PK
      INT assignment_id FK
      STRING assignment_name
      STRING course
      STRING term
      INT created_by FK
      ENUM status "DRAFT, WAIT_COORDINATOR, WAIT_TUTOR, READY_FOR_REVIEW, COMPLETED"
      STRING student_id
      DATETIME created_at
      DATETIME updated_at
    }

    SUBMISSION_FILES {
      INT id PK
      INT submission_id FK
      INT step_index
      ENUM actor_role "COORDINATOR, TUTOR"
      ENUM part_kind "ASSIGNMENT, SCORE"
      STRING filename
      STRING path
      STRING mime
      INT size
      INT uploaded_by FK
      DATETIME uploaded_at
    }