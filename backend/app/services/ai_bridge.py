import logging
import os
import shutil
import stat
import time
from pathlib import Path

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parents[2]
AI_DIR = BACKEND_DIR.parent / "AI"
RUBRIC_DIR = AI_DIR / "artifacts" / "rubric"
MARKED_DIR = AI_DIR / "data" / "marked"
MARKED_DIR_MARK_Folder = AI_DIR / "data" / "marked" / "mark"
MARKED_DIR_ASS_Folder = AI_DIR / "data" / "marked" / "assignments"
AI_TEST_DIR = AI_DIR / "data" / "test"


def _handle_remove_readonly(func, path, _exc):
    try:
        os.chmod(path, stat.S_IWRITE)
    except OSError as exc:
        logger.debug("Failed to chmod %s during cleanup: %s", path, exc)
    try:
        func(path)
    except Exception as exc:
        logger.warning(
            "Failed to remove %s via %s: %s",
            path,
            getattr(func, "__name__", func),
            exc,
        )


def _single_file_from(folder: Path) -> Path:
    candidates = [p for p in folder.iterdir() if p.is_file()]
    if not candidates:
        raise FileNotFoundError(f"No file found inside {folder}")
    if len(candidates) > 1:
        print(f"[WARN] {folder} has multiple files, using {candidates[0].name}")
    return candidates[0]



def _clean_dir(d: Path):
    d.mkdir(parents=True, exist_ok=True)
    for attempt in range(5):
        try:
            for p in d.iterdir():
                if p.is_file() or p.is_symlink():
                    try:
                        p.unlink()
                    except PermissionError:
                        _handle_remove_readonly(os.remove, str(p), None)
                else:
                    shutil.rmtree(p, onerror=_handle_remove_readonly)
            return
        except OSError:
            time.sleep(0.5)
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True, exist_ok=True)




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









def copy_students_for_predict_to_ai(student_files_root: Path, source="Tutor"):
    print(f"[AI][BRIDGE] AI_TEST_DIR={AI_TEST_DIR}", flush=True)
    print(f"[AI][BRIDGE] assignment_root={student_files_root}", flush=True)

    _clean_dir(AI_TEST_DIR)

    base = student_files_root / "submissions"
    role_folder = (
        "Student_assignment_with_Tutor_mark"
        if source.lower() == "tutor"
        else "Student_assignment_with_coordinator_mark"
    )
    root = base / role_folder
    print(f"[AI][BRIDGE] staging root={root} exists={root.exists()}", flush=True)
    if not root.exists():
        raise FileNotFoundError(f"not found: {root}")

    allowed_suffixes = [".docx", ".doc", ".pdf"]

    copied = []
    try:
        for zid_dir in root.iterdir():
            if not zid_dir.is_dir():
                continue
            zid = zid_dir.name.lower()
            for f in zid_dir.iterdir():
                name_lower = f.name.lower()
                if not name_lower.startswith(f"{zid}_assignment."):
                    continue
                suffix = f.suffix.lower()
                if suffix not in allowed_suffixes:
                    continue

                dest = AI_TEST_DIR / f"{zid}{suffix}"
                if dest.exists():
                    try:
                        dest.unlink()
                    except PermissionError:
                        _handle_remove_readonly(os.remove, str(dest), None)
                shutil.copy2(f, dest)
                copied.append(str(dest))
    except Exception as e:
        print(f"[AI][BRIDGE] staging loop failed: {e}", flush=True)
        import traceback

        traceback.print_exc()
        raise
    print(f"[AI][BRIDGE] copied={len(copied)}", flush=True)
    return copied
