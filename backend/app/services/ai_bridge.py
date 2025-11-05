import os, shutil, glob, json
from pathlib import Path

# === path ===
BACKEND_DIR = Path(__file__).resolve().parents[2]           # backend/
AI_DIR      = BACKEND_DIR.parent / "AI"                      # AI/
RUBRIC_DIR  = AI_DIR / "artifacts" / "rubric"               # init 
MARKED_DIR  = AI_DIR / "data" / "marked"                    # learn 
UPLOADS_PREDICT_DIR = BACKEND_DIR / "uploads"               # predict 
PRED_OUT_DIR = BACKEND_DIR / "marking_result"
PRED_OUT_JSON = PRED_OUT_DIR / "ai_latest_results.json"

def _clean_dir(d: Path):
    d.mkdir(parents=True, exist_ok=True)
    for p in d.glob("*"):
        if p.is_file():
            p.unlink()

def copy_spec_and_rubric_to_ai(spec_path: Path, rubric_path: Path):
    _clean_dir(RUBRIC_DIR)
    spec_ext = spec_path.suffix.lower()
    rub_ext  = rubric_path.suffix.lower()
    shutil.copy2(spec_path, RUBRIC_DIR / f"assignment{spec_ext}")
    shutil.copy2(rubric_path, RUBRIC_DIR / f"rubric{rub_ext}")
    return RUBRIC_DIR / f"rubric{rub_ext}"

def copy_teacher_marked_to_ai(marked_root: Path):
    MARKED_DIR.mkdir(parents=True, exist_ok=True)
    dst = MARKED_DIR / marked_root.name
    if dst.exists():
        shutil.rmtree(dst)
    shutil.copytree(marked_root, dst)
    return dst

def copy_students_for_predict_to_ai(student_files_root: Path, source="Tutor"):
    UPLOADS_PREDICT_DIR.mkdir(parents=True, exist_ok=True)
    for p in UPLOADS_PREDICT_DIR.glob("*"):
        if p.is_file():
            p.unlink()

    base = student_files_root / "submissions"
    role_folder = "Student_assignment_with_Tutor_mark" if source.lower() == "tutor" else "Student_assignment_with_coordinator_mark"
    root = base / role_folder
    if not root.exists():
        raise FileNotFoundError(f"not found: {root}")

    for zid_dir in root.iterdir():
        if not zid_dir.is_dir():
            continue
        for f in zid_dir.glob(f"{zid_dir.name}_assignment.*"):
            shutil.copy2(f, UPLOADS_PREDICT_DIR / f.name)

    return list(map(str, UPLOADS_PREDICT_DIR.glob("*")))
