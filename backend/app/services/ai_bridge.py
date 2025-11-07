import shutil
from pathlib import Path

# === path ===
BACKEND_DIR = Path(__file__).resolve().parents[2]           # backend/
AI_DIR      = BACKEND_DIR.parent / "AI"                      # AI/
RUBRIC_DIR  = AI_DIR / "artifacts" / "rubric"               # init 
MARKED_DIR  = AI_DIR / "data" / "marked"                    # learn 
AI_TEST_DIR = AI_DIR / "data" / "test"                      # predict staging
PRED_OUT_DIR = BACKEND_DIR / "marking_result"
PRED_OUT_JSON = PRED_OUT_DIR / "ai_latest_results.json"

def _clean_dir(d: Path):
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True, exist_ok=True)

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
    _clean_dir(AI_TEST_DIR)

    base = student_files_root / "submissions"
    role_folder = "Student_assignment_with_Tutor_mark" if source.lower() == "tutor" else "Student_assignment_with_coordinator_mark"
    root = base / role_folder
    if not root.exists():
        raise FileNotFoundError(f"not found: {root}")

    for zid_dir in root.iterdir():
        if not zid_dir.is_dir():
            continue
        zid = zid_dir.name.lower()
        for f in zid_dir.glob(f"{zid}_assignment.*"):
            suffix = f.suffix.lower() or ".docx"
            dest = AI_TEST_DIR / f"{zid}{suffix}"
            shutil.copy2(f, dest)

    return list(map(str, AI_TEST_DIR.glob("*")))
