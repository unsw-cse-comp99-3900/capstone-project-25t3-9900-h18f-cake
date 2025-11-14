from app.services import marking_sync


def test_to_float_handles_valid_and_invalid_values():
    assert marking_sync._to_float("3.5") == 3.5
    assert marking_sync._to_float(2) == 2.0
    assert marking_sync._to_float(None) is None
    assert marking_sync._to_float("not-a-number") is None


def test_format_score_text_represents_ints_and_decimals():
    assert marking_sync._format_score_text(None) == "score: N/A"
    assert marking_sync._format_score_text(4) == "score: 4"
    assert marking_sync._format_score_text(3.14159) == "score: 3.14"


def test_pretty_label_normalizes_whitespace_and_placeholders():
    assert marking_sync._pretty_label("section_total") == "section total"
    assert marking_sync._pretty_label("  multi   space ") == "multi space"
    assert marking_sync._pretty_label(None) == "component"


def test_upsert_record_updates_existing_entry_case_insensitive():
    data = {
        "marking_results": [
            {"zid": "Z1234567", "assignment_id": 7, "ai_total": 80, "marked_by": "ai"}
        ]
    }
    payload = {"ai_total": 85, "marked_by": "ai", "needs_review": False}

    record = marking_sync._upsert_record(data, "z1234567", 7, payload)

    assert record["ai_total"] == 85
    assert record["marked_by"] == "ai"
    assert data["marking_results"][0]["needs_review"] is False
    # original keys remain unless overwritten
    assert "assignment_id" in data["marking_results"][0]


def test_upsert_record_appends_when_no_match():
    data = {"marking_results": []}
    payload = {"zid": "z9999999", "assignment_id": 3, "ai_total": 70}

    record = marking_sync._upsert_record(data, "z9999999", 3, payload)

    assert record == payload
    assert data["marking_results"][0] == payload


def test_upsert_record_distinguishes_assignments_for_same_zid():
    data = {
        "marking_results": [
            {"zid": "z1234567", "assignment_id": 1, "ai_total": 60},
        ]
    }
    payload = {"ai_total": 75, "assignment_id": 2}

    record = marking_sync._upsert_record(data, "z1234567", 2, payload)

    assert len(data["marking_results"]) == 2
    assert record["assignment_id"] == 2
    assert data["marking_results"][0]["assignment_id"] == 1
