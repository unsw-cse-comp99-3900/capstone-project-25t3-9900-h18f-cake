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
