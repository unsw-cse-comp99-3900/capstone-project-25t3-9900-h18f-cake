from __future__ import annotations

import argparse
import csv
import json
from collections import OrderedDict
from pathlib import Path
from typing import Iterable


def course_csv_path_by_components(course_code: str, year: str, term_norm: str) -> Path:
    folder = Path("marking_result_csv") / f"{year}_{term_norm}"
    folder.mkdir(parents=True, exist_ok=True)
    return folder / f"{course_code}.csv"


def _detect_year_term(json_path: Path) -> tuple[str, str]:
    parent_name = json_path.parent.name
    if "_" in parent_name:
        year, term_norm = parent_name.split("_", 1)
        return year.strip(), term_norm.strip()
    return "unknown", "TermX"


def _collect_rubric_keys(data: dict) -> tuple[list[str], list[str]]:
    tutor_keys = OrderedDict()
    ai_keys = OrderedDict()
    for record in data.get("marking_results", []):
        if not isinstance(record, dict):
            continue
        for k in (record.get("tutor_marking_detail") or {}).keys():
            tutor_keys.setdefault(k, None)
        for k in (record.get("ai_marking_detail") or {}).keys():
            ai_keys.setdefault(k, None)
    return list(tutor_keys.keys()), list(ai_keys.keys())


def _col_name(prefix: str, rubric: str) -> str:
    safe = rubric.replace(" ", "_").replace(":", "_")
    return f"{prefix}_{safe}"


def export_single_json(json_path: Path) -> Path:
    if not json_path.exists():
        raise FileNotFoundError(json_path)

    data = json.loads(json_path.read_text(encoding="utf-8"))
    year, term_norm = _detect_year_term(json_path)
    course_code = (data.get("course") or json_path.stem).strip()
    course_name = (data.get("name") or "").strip()
    term_label = data.get("term") or f"{year} {term_norm}"

    tutor_keys, ai_keys = _collect_rubric_keys(data)

    base_fields = [
        "course_code",
        "course_name",
        "term",
        "zid",
        "student_name",
        "assignment",
        "tutor_total",
        "ai_total",
        "difference",
    ]
    tutor_fields = [_col_name("tutor", k) for k in tutor_keys]
    ai_fields = [_col_name("ai", k) for k in ai_keys]
    fieldnames = base_fields + tutor_fields + ai_fields

    rows = []
    for record in data.get("marking_results", []):
        if not isinstance(record, dict):
            continue
        row = {
            "course_code": course_code,
            "course_name": course_name,
            "term": term_label,
            "zid": record.get("zid"),
            "student_name": record.get("student_name"),
            "assignment": record.get("assignment"),
            "tutor_total": record.get("tutor_total"),
            "ai_total": record.get("ai_total"),
            "difference": record.get("difference"),
        }
        tutor_detail = record.get("tutor_marking_detail") or {}
        for key in tutor_keys:
            val = tutor_detail.get(key)
            row[_col_name("tutor", key)] = val.get("score") if isinstance(val, dict) else val

        ai_detail = record.get("ai_marking_detail") or {}
        for key in ai_keys:
            val = ai_detail.get(key)
            row[_col_name("ai", key)] = val.get("score") if isinstance(val, dict) else val

        rows.append(row)

    csv_path = course_csv_path_by_components(course_code, year, term_norm)
    if not rows:
        csv_path.write_text("", encoding="utf-8")
        return csv_path

    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    return csv_path


def iter_json_targets(paths: Iterable[str]) -> list[Path]:
    targets: list[Path] = []
    for raw in paths:
        p = Path(raw)
        if p.is_file() and p.suffix.lower() == ".json":
            targets.append(p)
        elif p.is_dir():
            targets.extend(sorted(p.glob("*.json")))
    return targets


def main():
    parser = argparse.ArgumentParser(description="Export marking_result JSON files to CSV.")
    parser.add_argument(
        "paths",
        nargs="+",
        help="JSON file(s) or directory(ies) under backend/marking_result to export.",
    )
    args = parser.parse_args()

    targets = iter_json_targets(args.paths)
    if not targets:
        raise SystemExit("No JSON files found for export.")

    for json_path in targets:
        csv_path = export_single_json(json_path)
        print(f"[OK] {json_path} -> {csv_path}")


if __name__ == "__main__":
    main()
