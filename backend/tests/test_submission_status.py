from types import SimpleNamespace

import pytest

from app.models import ActorRole, PartKind, SubmissionStatus
from app.utils.submission_status import compute_status


def make_submission(files):
    return SimpleNamespace(files=list(files))


def make_file(role, kind):
    return SimpleNamespace(actor_role=role, part_kind=kind)


def test_submission_waits_for_coordinator_mark():
    sub = make_submission(
        [
            make_file(ActorRole.COORDINATOR, PartKind.ASSIGNMENT),
            make_file(ActorRole.TUTOR, PartKind.ASSIGNMENT),
        ]
    )

    assert compute_status(sub) == SubmissionStatus.WAIT_COORDINATOR


def test_submission_waits_for_tutor_mark():
    sub = make_submission(
        [
            make_file(ActorRole.COORDINATOR, PartKind.ASSIGNMENT),
            make_file(ActorRole.COORDINATOR, PartKind.SCORE),
        ]
    )

    assert compute_status(sub) == SubmissionStatus.WAIT_TUTOR


@pytest.mark.parametrize(
    "extra_files",
    [
        [],
        [make_file(ActorRole.COORDINATOR, PartKind.ASSIGNMENT)],
        [make_file(ActorRole.TUTOR, PartKind.SCORE)],
    ],
)
def test_submission_ready_when_all_parts_present(extra_files):
    base_files = [
        make_file(ActorRole.COORDINATOR, PartKind.ASSIGNMENT),
        make_file(ActorRole.COORDINATOR, PartKind.SCORE),
        make_file(ActorRole.TUTOR, PartKind.ASSIGNMENT),
        make_file(ActorRole.TUTOR, PartKind.SCORE),
    ]

    sub = make_submission(base_files + extra_files)

    assert compute_status(sub) == SubmissionStatus.READY_FOR_REVIEW
