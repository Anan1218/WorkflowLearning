from __future__ import annotations

from core.guidelines import evaluate_guidelines
from core.schemas import Party, SuretySubmission, WIPProject


def _submission(**kwargs) -> SuretySubmission:
    data = {
        "principal": Party(name="Test Contractor LLC"),
        "obligee": Party(name="Test Obligee"),
        "bond_type": "performance",
        "bond_amount": 1_000_000.0,
        "working_capital": 100_000.0,
        "net_worth": 750_000.0,
        "wip_schedule": [],
        "field_confidences": {},
    }
    data.update(kwargs)
    return SuretySubmission(**data)


def _by_id(sub: SuretySubmission):
    return {r.guideline_id: r for r in evaluate_guidelines(sub, [], 0.75)}


def test_liquidity_check_fires_below_ten_percent_only() -> None:
    below = _by_id(_submission(bond_amount=1_000_000.0, working_capital=99_999.0))
    at_threshold = _by_id(_submission(bond_amount=1_000_000.0, working_capital=100_000.0))
    above = _by_id(_submission(bond_amount=1_000_000.0, working_capital=125_000.0))

    assert "UW-03" in below
    assert "UW-03" not in at_threshold
    assert "UW-03" not in above


def test_program_fit_maps_bond_amount_tiers() -> None:
    cases = [
        (400_000.0, "FirstStep"),
        (900_000.0, "Next Step"),
        (2_000_000.0, "Standard"),
    ]

    for bond_amount, tier in cases:
        rationales = _by_id(_submission(bond_amount=bond_amount))
        assert rationales["UW-04"].reason.endswith(f"maps to the {tier} program tier.")


def test_wip_consistency_fires_on_billings_above_contract() -> None:
    sub = _submission(
        wip_schedule=[
            WIPProject(
                project_name="Marion Trail Phase 1",
                contract_amount=620_000.0,
                total_estimated_cost=585_000.0,
                billings_to_date=640_000.0,
            )
        ]
    )

    rationales = _by_id(sub)

    assert "UW-05" in rationales
    assert rationales["UW-05"].fields == ["wip_schedule"]
    assert "Marion Trail Phase 1" in rationales["UW-05"].reason


def test_completeness_fires_for_standard_tier_missing_requirements() -> None:
    rationales = _by_id(
        _submission(
            bond_amount=1_850_000.0,
            working_capital=225_000.0,
            net_worth=None,
            wip_schedule=[],
        )
    )

    assert "UW-06" in rationales
    assert rationales["UW-06"].fields == ["net_worth", "wip_schedule"]
    assert (
        rationales["UW-06"].reason
        == "Missing for the Standard file: net_worth and wip_schedule."
    )


def test_completeness_silent_for_complete_standard_tier_submission() -> None:
    rationales = _by_id(
        _submission(
            bond_amount=1_850_000.0,
            working_capital=225_000.0,
            net_worth=950_000.0,
            wip_schedule=[
                WIPProject(
                    project_name="Marion Trail Phase 1",
                    contract_amount=620_000.0,
                    total_estimated_cost=585_000.0,
                )
            ],
        )
    )

    assert "UW-06" not in rationales


def test_completeness_next_step_requires_one_financial_field() -> None:
    missing_both = _by_id(
        _submission(
            bond_amount=900_000.0,
            working_capital=None,
            net_worth=None,
        )
    )
    has_working_capital = _by_id(
        _submission(
            bond_amount=900_000.0,
            working_capital=100_000.0,
            net_worth=None,
        )
    )
    has_net_worth = _by_id(
        _submission(
            bond_amount=900_000.0,
            working_capital=None,
            net_worth=750_000.0,
        )
    )

    assert missing_both["UW-06"].fields == ["working_capital", "net_worth"]
    assert "UW-06" not in has_working_capital
    assert "UW-06" not in has_net_worth


def test_completeness_silent_for_firststep_tier() -> None:
    rationales = _by_id(
        _submission(
            bond_amount=400_000.0,
            working_capital=None,
            net_worth=None,
            wip_schedule=[],
        )
    )

    assert "UW-06" not in rationales


def test_confidence_and_unscored_rationales_group_flagged_fields() -> None:
    sub = _submission()
    rationales = {
        r.guideline_id: r
        for r in evaluate_guidelines(
            sub,
            [
                {"path": "principal.fein", "value": "82-4471956", "confidence": 0.62},
                {"path": "working_capital", "value": 145_000.0, "confidence": 0.68},
                {"path": "obligee.name", "value": "Linn County", "confidence": None},
                {"path": "bond_amount", "value": 1_850_000.0, "confidence": None},
            ],
            0.75,
        )
    }

    assert rationales["UW-01"].fields == ["principal.fein", "working_capital"]
    assert "principal.fein confidence 0.62" in rationales["UW-01"].reason
    assert "working_capital confidence 0.68" in rationales["UW-01"].reason
    assert rationales["UW-02"].fields == ["obligee.name", "bond_amount"]
    assert "obligee.name and bond_amount" in rationales["UW-02"].reason
