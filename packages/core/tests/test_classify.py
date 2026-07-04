from __future__ import annotations

import pytest
from pydantic import ValidationError

from core.classify import SubmissionClassification, classify_with_meta


def test_submission_classification_validates_good_payload() -> None:
    classification = SubmissionClassification(
        doc_type="broker_email",
        surety_line="contract",
        summary="A broker email asks for a performance bond quote.",
        confidence=0.92,
    )

    assert classification.doc_type == "broker_email"
    assert classification.surety_line == "contract"
    assert classification.confidence == 0.92


def test_submission_classification_rejects_confidence_above_one() -> None:
    with pytest.raises(ValidationError):
        SubmissionClassification(
            doc_type="broker_email",
            surety_line="contract",
            summary="A broker email asks for a performance bond quote.",
            confidence=1.5,
        )


def test_submission_classification_rejects_bad_doc_type() -> None:
    with pytest.raises(ValidationError):
        SubmissionClassification(
            doc_type="invoice",
            surety_line="contract",
            summary="An invoice asks for payment.",
            confidence=0.8,
        )


def test_classify_with_meta_is_importable() -> None:
    assert callable(classify_with_meta)
