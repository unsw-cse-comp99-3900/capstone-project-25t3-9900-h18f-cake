from collections import defaultdict

from ..models import ActorRole, PartKind, Submission, SubmissionStatus


def compute_status(sub: Submission) -> SubmissionStatus:
    has = defaultdict(bool)
    for f in sub.files:
        has[(f.actor_role, f.part_kind)] = True
    if not (
        has[(ActorRole.COORDINATOR, PartKind.ASSIGNMENT)]
        and has[(ActorRole.COORDINATOR, PartKind.SCORE)]
    ):
        return SubmissionStatus.WAIT_COORDINATOR
    if not (
        has[(ActorRole.TUTOR, PartKind.ASSIGNMENT)]
        and has[(ActorRole.TUTOR, PartKind.SCORE)]
    ):
        return SubmissionStatus.WAIT_TUTOR

    return SubmissionStatus.READY_FOR_REVIEW
