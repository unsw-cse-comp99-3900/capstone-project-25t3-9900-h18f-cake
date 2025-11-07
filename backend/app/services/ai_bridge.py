import os
import time
import stat
import shutil
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2] 
AI_DIR      = BACKEND_DIR.parent / "AI" 
RUBRIC_DIR  = AI_DIR / "artifacts" / "rubric"
MARKED_DIR  = AI_DIR / "data" / "marked"
AI_TEST_DIR = AI_DIR / "data" / "test"   


def _handle_remove_readonly(func, path, _exc):
    try:
        os.chmod(path, stat.S_IWRITE)
    except Exception:
        pass
    try:
        func(path)
    except Exception:
        pass

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
        import traceback; traceback.print_exc()
        raise
    print(f"[AI][BRIDGE] copied={len(copied)}", flush=True)
    return copied
