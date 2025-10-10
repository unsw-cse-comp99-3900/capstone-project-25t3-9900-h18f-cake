import os
from pathlib import Path
from fastapi import UploadFile, HTTPException

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED = {"pdf","doc","docx","txt"}

def _assert_allowed(filename: str):
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"Unsupported extension: .{ext}")

async def save_upload(file: UploadFile, subdir: str = "") -> str:
    _assert_allowed(file.filename)
    dest_dir = UPLOAD_DIR / subdir
    dest_dir.mkdir(parents=True, exist_ok=True)
    name, i, path = file.filename, 1, dest_dir / file.filename
    while path.exists():
        stem, ext = os.path.splitext(name)
        path = dest_dir / f"{stem}_{i}{ext}"
        i += 1
    with path.open("wb") as f:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk: break
            f.write(chunk)
    return str(path)
