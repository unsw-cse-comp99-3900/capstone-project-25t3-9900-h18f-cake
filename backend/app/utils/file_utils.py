import json
from datetime import datetime
from pathlib import Path
from typing import Any, Mapping


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def save_meta_json(
    folder: Path | str, patch: Mapping[str, Any], name: str = "meta.json"
) -> str:
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / name

    if path.exists():
        try:
            old = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            old = {}
    else:
        old = {}

    merged = dict(old)
    for k, v in patch.items():
        if v is not None:
            merged[k] = v
    if "created_at" not in merged:
        merged["created_at"] = _now_iso()
    merged["updated_at"] = _now_iso()
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)

    return str(path)
