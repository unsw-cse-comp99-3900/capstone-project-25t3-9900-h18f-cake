from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import shutil, re
from datetime import datetime
from pathlib import Path
from ..db import get_db
from ..models import Submission, SubmissionFile, ActorRole, PartKind 
from ..schemas import SubmissionDetailOut
from ..deps import get_current_user
from ..utils.submission_status import compute_status
from ..utils.file_utils import save_meta_json
from ..utils.path_utils import assignment_dir, student_dir
from ..services.marking_sync import sync_tutor_mark_from_file
from ..services.ai_runner import run_ai_marking_pipeline

router = APIRouter(prefix="/v1/submissions", tags=["submissions"])


# ---------- Helper ----------
def extract_student_id(filename: str) -> Optional[str]:
    m = re.search(r"[zZ]\d{7}", filename)
    return m.group(0).lower() if m else None


def _role_kind_from_step(step_index: int) -> tuple[ActorRole, PartKind]:
    if step_index == 3: return ActorRole.COORDINATOR, PartKind.ASSIGNMENT
    if step_index == 4: return ActorRole.COORDINATOR, PartKind.SCORE
    if step_index == 5: return ActorRole.TUTOR, PartKind.ASSIGNMENT
    if step_index == 6: return ActorRole.TUTOR, PartKind.SCORE
    return ActorRole.COORDINATOR, PartKind.ASSIGNMENT

# def _save_step_files(
#     db: Session,
#     sub: Submission,
#     course: str,
#     term: str,
#     assignment_name: str,
#     assignment_id: int | None,
#     step_index: int,
#     files: List[UploadFile],
#     user_id: int,
#     student_id: Optional[str] = None,
# ) -> list[Path]:

#     base_assignment: Path = assignment_dir(course, term, assignment_name, assignment_id or 0)
#     sid = (student_id or getattr(sub, "student_id", None) or f"unknown-{sub.id}").lower()
#     bucket = step_bucket(step_index)
#     step_dir = student_dir(base_assignment, sid) / bucket
#     step_dir.mkdir(parents=True, exist_ok=True)
#     role, kind = _role_kind_from_step(step_index)

#     saved_paths: list[Path] = []
#     for uf in files or []:
#         suffix = Path(uf.filename).suffix or ".dat"
#         fname = f"{sid}{suffix}"
#         dest = step_dir / fname
#         for old in step_dir.glob(f"{sid}.*"):
#             try:
#                 old.unlink()
#             except Exception:
#                 pass

#         with open(dest, "wb") as f:
#             shutil.copyfileobj(uf.file, f)

#         db.add(SubmissionFile(
#             submission_id=sub.id,
#             step_index=step_index,
#             actor_role=role,
#             part_kind=kind,
#             filename=fname,
#             path=str(dest),
#             mime=uf.content_type,
#             size=None,
#             uploaded_by=user_id,
#             uploaded_at=datetime.utcnow(),
#         ))
#         saved_paths.append(dest)

#     return saved_paths


def _save_step_files(
    db: Session,
    sub: Submission,
    course: str,
    term: str,
    assignment_name: str,
    assignment_id: int | None,
    step_index: int,
    files: List[UploadFile],
    user_id: int,
    student_id: Optional[str] = None,
) -> list[Path]:
    """
    Save uploaded files grouped by marker role.

    File layout under uploads/.../submissions:
      - Student_assignment_with_coordinator_mark/<zid>/<zid>_{assignment|mark}.*
      - Student_assignment_with_Tutor_mark/<zid>/<zid>_{assignment|mark}.*
    """

    base_assignment: Path = assignment_dir(course, term, assignment_name, assignment_id or 0)
    sid = (student_id or getattr(sub, "student_id", None) or f"unknown-{sub.id}").lower()
    role, kind = _role_kind_from_step(step_index)

    folder_by_role = {
        ActorRole.COORDINATOR: "Student_assignment_with_coordinator_mark",
        ActorRole.TUTOR: "Student_assignment_with_Tutor_mark",
    }
    mark_folder = folder_by_role.get(role, "Student_assignment_with_coordinator_mark")

    label_by_kind = {
        PartKind.ASSIGNMENT: "assignment",
        PartKind.SCORE: "mark",
    }
    label = label_by_kind.get(kind, f"step{step_index}")

    step_dir = base_assignment / "submissions" / mark_folder / sid
    step_dir.mkdir(parents=True, exist_ok=True)

    saved_paths: list[Path] = []
    for uf in files or []:
        suffix = Path(uf.filename).suffix or ".dat"
        fname = f"{sid}_{label}{suffix}"
        dest = step_dir / fname

        # cleanup old versions of same step
        for old in step_dir.glob(f"{sid}_{label}.*"):
            try:
                old.unlink()
            except Exception:
                pass

        with open(dest, "wb") as f:
            shutil.copyfileobj(uf.file, f)

        db.add(SubmissionFile(
            submission_id=sub.id,
            step_index=step_index,
            actor_role=role,
            part_kind=kind,
            filename=fname,
            path=str(dest),
            mime=uf.content_type,
            size=None,
            uploaded_by=user_id,
            uploaded_at=datetime.utcnow(),
        ))
        saved_paths.append(dest)







    # # update marked file's question adn tutor mark into course marking result json file
    # if step_index == 6 and role.name == "TUTOR" and kind.name == "SCORE":
    #     try:
    #         extractor = TutorMarkExtractor()
    #         extracted = extractor.extract_marks(str(dest))

    #         # 构造 payload 与 MarkingIn 对齐
    #         payload = {
    #             "zid": extracted["zid"],
    #             "tutor_marking_detail": extracted["tutor_marking_detail"],
    #             "tutor_total": extracted["tutor_total"],
    #             "marked_by": "tutor",
    #             "needs_review": False,
    #             "review_status": "unchecked"
    #         }

    #         # 发送 POST 请求到本地 API
    #         url = f"http://127.0.0.1:8000/v1/marking_result/{sub.assignment_id}/append"
    #         res = requests.post(url, json=payload)
    #         if res.status_code == 200:
    #             print(f"[INFO] Tutor marks for {extracted['zid']} updated via /append")
    #         else:
    #             print(f"[WARN] Failed to update via API: {res.status_code}, {res.text}")

    #     except Exception as e:
    #         print(f"[WARN] Tutor mark extraction failed: {e}")




    return saved_paths




# ---------- Create single submission ----------
@router.post("", response_model=SubmissionDetailOut)
async def create_submission(
    background: BackgroundTasks,
    assignmentName: str = Form(...),
    course: str = Form(...),
    term: str = Form(""),
    studentId: Optional[str] = Form(None),

    step1: Optional[List[UploadFile]] = File(None),
    step2: Optional[List[UploadFile]] = File(None),
    step3: Optional[List[UploadFile]] = File(None),
    step4: Optional[List[UploadFile]] = File(None),
    step5: Optional[List[UploadFile]] = File(None),
    step6: Optional[List[UploadFile]] = File(None),

    assignmentId: Optional[int] = Form(None),   
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    sub = Submission(
        assignment_id=assignmentId,
        assignment_name=assignmentName,
        course=course,
        term=term or "",
        created_by=int(user.sub),
        student_id=studentId.lower() if studentId else None,
    )
    db.add(sub)
    db.flush()

    tutor_mark_paths: list[Path] = []
    ai_assignment_paths: list[Path] = []

    for idx, files in [(1, step1), (2, step2), (3, step3),
                       (4, step4), (5, step5), (6, step6)]:
        if files:
            saved = _save_step_files(
                db=db,
                sub=sub,
                course=course,
                term=term or "",
                assignment_name=assignmentName,
                assignment_id=assignmentId,
                step_index=idx,
                files=files,
                user_id= int(user.sub),
                student_id=studentId,
            )
            if idx == 5:
                ai_assignment_paths.extend(saved)
            if idx == 6:
                tutor_mark_paths.extend(saved)

    sub.status = compute_status(sub)

    for mark_path in tutor_mark_paths:
        try:
            sync_tutor_mark_from_file(db, sub, mark_path)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to sync tutor mark: {exc}")

    if assignmentId and ai_assignment_paths:
        background.add_task(run_ai_marking_pipeline, assignmentId)

    base_assignment: Path = assignment_dir(course, term or "", assignmentName, assignmentId or 0)
    sid_for_meta = (studentId or sub.student_id or f"unknown-{sub.id}").lower()
    student_folder = student_dir(base_assignment, sid_for_meta)
    meta = {
        "submission_id": sub.id,
        "assignment_id": assignmentId,
        "assignment_name": assignmentName,
        "course": course,
        "term": term,
        "student_id": sid_for_meta,
        "status": sub.status.value if hasattr(sub.status, "value") else sub.status,
        "uploaded_by": user.sub,
        "steps_uploaded": [idx for idx, f in [(1, step1), (2, step2),
                                              (3, step3), (4, step4),
                                              (5, step5), (6, step6)] if f],
    }
    meta_path = save_meta_json(student_folder, meta)
    sub.meta_json = str(meta_path)

    db.commit()
    db.refresh(sub)
    return sub


# ---------- Append extra files ----------
@router.put("/{submission_id}/files", response_model=SubmissionDetailOut)
async def append_files(
    background: BackgroundTasks,
    submission_id: int,
    stepIndex: int = Form(..., ge=1, le=6),
    files: List[UploadFile] = File(...),
    studentId: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    sub = db.get(Submission, submission_id)
    if not sub:
        raise HTTPException(404, "Submission not found")

    saved_paths = _save_step_files(
        db=db,
        sub=sub,
        course=sub.course,
        term=sub.term,
        assignment_name=sub.assignment_name,
        assignment_id=sub.assignment_id,
        step_index=stepIndex,
        files=files,
        user_id=int(user.sub),
        student_id=(studentId or sub.student_id),
    )
    if stepIndex == 5 and sub.assignment_id:
        background.add_task(run_ai_marking_pipeline, sub.assignment_id)
    if stepIndex == 6:
        for mark_path in saved_paths:
            try:
                sync_tutor_mark_from_file(db, sub, mark_path)
            except Exception as exc:
                raise HTTPException(status_code=500, detail=f"Failed to sync tutor mark: {exc}")
    sub.status = compute_status(sub)
    base_assignment: Path = assignment_dir(sub.course, sub.term, sub.assignment_name, sub.assignment_id or 0)
    sid_for_meta = (studentId or sub.student_id or f"unknown-{sub.id}").lower()
    student_folder = student_dir(base_assignment, sid_for_meta)
    meta = {
        "submission_id": sub.id,
        "assignment_id": sub.assignment_id,
        "assignment_name": sub.assignment_name,
        "course": sub.course,
        "term": sub.term,
        "student_id": sid_for_meta,
        "status": sub.status.value if hasattr(sub.status, "value") else sub.status,
        "updated_step": stepIndex,
        "updated_at": datetime.utcnow().isoformat(),
    }
    meta_path = save_meta_json(student_folder, meta)
    sub.meta_json = str(meta_path)

    db.commit()
    db.refresh(sub)
    return sub


# ---------- Get single submission ----------
@router.get("/{submission_id}", response_model=SubmissionDetailOut)
def get_submission(submission_id: int,
                   db: Session = Depends(get_db),
                   user=Depends(get_current_user)):
    sub = db.get(Submission, submission_id)
    if not sub:
        raise HTTPException(404, "Submission not found")
    return sub


# ---------- Bulk upload for Step3 ----------
@router.post("/bulk", response_model=List[SubmissionDetailOut])
async def bulk_upload_student_assignments(
    assignmentId: int = Form(...),
    assignmentName: str = Form(...),
    course: str = Form(...),
    term: str = Form(""),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    created: list[Submission] = []

    for f in files:
        sid = extract_student_id(f.filename)
        if not sid:
            raise HTTPException(
                400, f"Filename {f.filename} missing student ID (expected like z1234567)"
            )

        sub = Submission(
            assignment_id=assignmentId,
            assignment_name=assignmentName,
            course=course,
            term=term or "",
            created_by=int(user.sub),
            student_id=sid,
        )
        db.add(sub)
        db.flush()

        # path：uploads/{course-term}/{assignmentSlug}-{assignmentId}/submissions/Student_assignment_with_coordinator_mark/{studentId}/{studentId}_assignment.<ext>
        base_assignment: Path = assignment_dir(course, term or "", assignmentName, assignmentId)
        storage_dir = base_assignment / "submissions" / "Student_assignment_with_coordinator_mark" / sid
        storage_dir.mkdir(parents=True, exist_ok=True)

        role, kind = ActorRole.COORDINATOR, PartKind.ASSIGNMENT

        suffix = Path(f.filename).suffix or ".pdf"
        dest = storage_dir / f"{sid}_assignment{suffix}"
        for old in storage_dir.glob(f"{sid}_assignment.*"):
            try:
                old.unlink()
            except Exception:
                pass
        with open(dest, "wb") as out:
            shutil.copyfileobj(f.file, out)

        db.add(SubmissionFile(
            submission_id=sub.id,
            step_index=3,
            actor_role=role,
            part_kind=kind,
            filename=dest.name,
            path=str(dest),
            mime=f.content_type,
            size=None,
            uploaded_by=int(user.sub),
            uploaded_at=datetime.utcnow(),
        ))

        meta_folder = student_dir(base_assignment, sid)
        sub.status = compute_status(sub)

        meta = {
            "submission_id": sub.id,
            "assignment_id": assignmentId,
            "assignment_name": assignmentName,
            "course": course,
            "term": term,
            "student_id": sid,
            "file_path": str(dest),
            "status": sub.status.value if hasattr(sub.status, "value") else sub.status,
            "uploaded_by": user.sub,
        }
        meta_path = save_meta_json(meta_folder, meta)
        sub.meta_json = str(meta_path)

        created.append(sub)

    db.commit()
    for s in created:
        db.refresh(s)
    return created
