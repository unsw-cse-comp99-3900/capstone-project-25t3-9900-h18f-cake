from fastapi import APIRouter, HTTPException
from pathlib import Path
from typing import List, Dict, Any
import requests

from ..tutor_marking_extract import TutorMarkExtractor

router = APIRouter(prefix="/v1/marking_result", tags=["extract_file_information"])

SUPPORTED_EXTENSIONS = {".docx", ".doc", ".pdf"}


def _resolve_tutor_mark_dir(path_str: str) -> Path:
    """
    Locate the Student_assignment_with_Tutor_mark directory from the provided path.
    Accept either the exact folder or its parent assignment directory.
    
    Just for backup to extract some information from inputs to backend database
    """
    p = Path(path_str).expanduser().resolve()
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"Path not found: {path_str}")

    if p.is_dir() and p.name == "Student_assignment_with_Tutor_mark":
        return p

    candidate = p / "Student_assignment_with_Tutor_mark"
    if candidate.exists() and candidate.is_dir():
        return candidate

    raise HTTPException(
        status_code=400,
        detail="Provided path must be the assignment root or the 'Student_assignment_with_Tutor_mark' folder.",
    )


def _collect_mark_files(mark_root: Path) -> List[Path]:
    """
    Expect folder structure: .../Student_assignment_with_Tutor_mark/<zid>/<zid>_mark.ext
    Gather all matching files.
    """
    mark_files: List[Path] = []
    for student_dir in mark_root.iterdir():
        if not student_dir.is_dir():
            continue
        zid = student_dir.name.lower()
        matched: List[Path] = []
        for ext in SUPPORTED_EXTENSIONS:
            candidate = student_dir / f"{zid}_mark{ext}"
            if candidate.exists():
                matched.append(candidate)
        if matched:
            # Prefer docx/doc over pdf if multiple exist
            matched.sort(key=lambda f: (f.suffix.lower() not in {".docx", ".doc"}, f.suffix.lower()))
            mark_files.append(matched[0])
    if not mark_files:
        raise HTTPException(
            status_code=404,
            detail=f"No tutor mark files found under {mark_root}",
        )
    return mark_files


def _post_marking_result(assignment_id: int, payload: Dict[str, Any]) -> Dict[str, Any]:
    url = f"http://127.0.0.1:8000/v1/marking_result/{assignment_id}/append"
    res = requests.post(url, json=payload, timeout=15)
    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail=res.text)
    return res.json()


@router.post("/extract")
def extract_and_update_marks(path: str, assignment_id: int):
    """
    Locate the Student_assignment_with_Tutor_mark directory, parse tutor score files,
    and call the marking_result append endpoint to update the data.
    """
    mark_dir = _resolve_tutor_mark_dir(path)
    files = _collect_mark_files(mark_dir)

    extractor = TutorMarkExtractor()

    successes: List[Dict[str, Any]] = []
    failures: List[Dict[str, Any]] = []

    for file in files:
        try:
            extracted = extractor.extract_marks(str(file))
            payload = {
                "zid": extracted["zid"],
                "assignment_id": assignment_id, 
                "tutor_marking_detail": extracted["tutor_marking_detail"],
                "tutor_total": extracted["tutor_total"],
                "marked_by": "tutor",
                "needs_review": False,
                "review_status": "unchecked",
            }
            response = _post_marking_result(assignment_id, payload)
            successes.append({"file": str(file), "payload": payload, "response": response})
        except HTTPException as http_exc:
            failures.append({"file": str(file), "error": http_exc.detail})
        except Exception as exc:
            failures.append({"file": str(file), "error": str(exc)})

    return {
        "status": "partial_success" if failures else "success",
        "processed": len(successes),
        "failed": failures,
        "successes": successes,
    }
