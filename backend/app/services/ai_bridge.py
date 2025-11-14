import shutil
from pathlib import Path

# === path ===
BACKEND_DIR = Path(__file__).resolve().parents[2]           # backend/
AI_DIR      = BACKEND_DIR.parent / "AI"                      # AI/
RUBRIC_DIR  = AI_DIR / "data" / "raw"               # init 
MARKED_DIR  = AI_DIR / "data" / "marked"                    # learn 
MARKED_DIR_MARK_Folder = AI_DIR / "data" / "marked" / "mark"
MARKED_DIR_ASS_Folder = AI_DIR / "data" / "marked" / "assignments"

AI_TEST_DIR = AI_DIR / "data" / "test"                      # predict staging
PRED_OUT_DIR = BACKEND_DIR / "marking_result"
PRED_OUT_JSON = PRED_OUT_DIR / "ai_latest_results.json"

def _clean_dir(d: Path):
    if d.exists():
        try:
            shutil.rmtree(d)
        except OSError:
            for child in d.iterdir():
                if child.is_dir():
                    shutil.rmtree(child, ignore_errors=True)
                else:
                    child.unlink(missing_ok=True)
            d.rmdir()
    d.mkdir(parents=True, exist_ok=True)


def _single_file_from(folder: Path) -> Path:
    candidates = [p for p in folder.iterdir() if p.is_file()]
    if not candidates:
        raise FileNotFoundError(f"No file found inside {folder}")
    if len(candidates) > 1:
        print(f"[WARN] {folder} has multiple files, using {candidates[0].name}")
    return candidates[0]

# def copy_spec_and_rubric_to_ai(course_root: Path):
#     _clean_dir(RUBRIC_DIR)
#     spec_path = course_root / "spec"
#     rubric_path = course_root / "rubric"


#     spec_ext = spec_path.suffix.lower()
#     rub_ext  = rubric_path.suffix.lower()
#     shutil.copy2(spec_path, RUBRIC_DIR / f"assignment{spec_ext}")
#     shutil.copy2(rubric_path, RUBRIC_DIR / f"rubric{rub_ext}")
#     return RUBRIC_DIR / f"rubric{rub_ext}"

def copy_spec_and_rubric_to_ai(course_root: Path):
    _clean_dir(RUBRIC_DIR)
    spec_file = _single_file_from(course_root / "spec")
    rubric_file = _single_file_from(course_root / "rubric")

    spec_ext = spec_file.suffix.lower() or ".pdf"
    rub_ext = rubric_file.suffix.lower() or ".pdf"
    shutil.copy2(spec_file, RUBRIC_DIR / f"assignment{spec_ext}")
    shutil.copy2(rubric_file, RUBRIC_DIR / f"rubric{rub_ext}")


def copy_teacher_marked_to_ai(coordinator_marked_root: Path, source = "coordinator"):
    _clean_dir(MARKED_DIR)
    base = coordinator_marked_root / "submissions"
    role_folder = "Student_assignment_with_coordinator_mark" 
    root = base / role_folder
    if not root.exists():
        raise FileNotFoundError(f"not found: {root}")
    

    MARKED_DIR.mkdir(parents=True, exist_ok=True)
    MARKED_DIR_MARK_Folder.mkdir(parents=True, exist_ok=True)
    MARKED_DIR_ASS_Folder.mkdir(parents=True, exist_ok=True)

    for zid_dir in root.iterdir():
        if not zid_dir.is_dir():
            continue
        zid = zid_dir.name.lower()
        for f in zid_dir.glob(f"{zid}_assignment.*"):
            suffix = f.suffix.lower() or ".docx"
            dest = MARKED_DIR_ASS_Folder / f"{zid}{suffix}"
            shutil.copy2(f, dest)
        for f in zid_dir.glob(f"{zid}_mark.*"):
            suffix = f.suffix.lower() or ".docx"
            dest = MARKED_DIR_MARK_Folder / f"{zid}_mark{suffix}"
            shutil.copy2(f, dest)



    # dst = MARKED_DIR / marked_root.name
    # if dst.exists():
    #     shutil.rmtree(dst)
    # shutil.copytree(marked_root, dst)
    # return dst




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
