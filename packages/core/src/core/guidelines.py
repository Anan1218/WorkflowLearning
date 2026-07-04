"""Documented underwriting SOP register and deterministic guideline evaluation."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from core.schemas import SuretySubmission


class GuidelineExample(BaseModel):
    given: str
    outcome: str


class Guideline(BaseModel):
    id: str
    title: str
    rule: str
    severity: Literal["route", "info"]
    route: str
    example: GuidelineExample


class Rationale(BaseModel):
    guideline_id: str
    title: str
    reason: str
    severity: Literal["route", "info"]
    fields: list[str]
    route: str


GUIDELINES: list[Guideline] = [
    Guideline(
        id="UW-01",
        title="Confidence floor",
        severity="route",
        route="Human review queue",
        rule=(
            "Any extracted field with model-reported confidence below the threshold cannot proceed "
            "unattended and routes to an underwriter."
        ),
        example=GuidelineExample(
            given="principal.fein extracted at confidence 0.62 against the 0.75 floor.",
            outcome="The field routes to the human review queue; it cannot auto-proceed.",
        ),
    ),
    Guideline(
        id="UW-02",
        title="Unscored field",
        severity="route",
        route="Human review queue",
        rule=(
            "A populated field the model did not assign a confidence to is treated as unverified "
            "and routes to an underwriter."
        ),
        example=GuidelineExample(
            given="net_worth populated but the model reported no confidence for it.",
            outcome="Treated as unverified and routed to review.",
        ),
    ),
    Guideline(
        id="UW-03",
        title="Liquidity check",
        severity="route",
        route="Underwriter judgment",
        rule="Working capital below 10% of the bond amount requires underwriter judgment before quoting.",
        example=GuidelineExample(
            given="Working capital $145,000 on a $1,850,000 bond (7.8%).",
            outcome="Below the 10% floor of $185,000; underwriter judgment before quoting.",
        ),
    ),
    Guideline(
        id="UW-04",
        title="Program fit",
        severity="info",
        route="Informational",
        rule=(
            "Bond amount maps the file to an RLI program tier: FirstStep up to $500K, "
            "Next Step $500K to $1.5M, Standard above $1.5M."
        ),
        example=GuidelineExample(
            given="Bond amount $1,850,000.",
            outcome="Maps to the Standard program: CPA-prepared financials expected.",
        ),
    ),
    Guideline(
        id="UW-05",
        title="WIP consistency",
        severity="route",
        route="Underwriter judgment",
        rule=(
            "Work-in-progress rows where billings exceed the contract amount, or cost to date "
            "exceeds total estimated cost, indicate billing or estimate problems and require review."
        ),
        example=GuidelineExample(
            given="Marion Trail Phase 1 billed $640,000 on a $620,000 contract.",
            outcome="Overbilling flagged; WIP review before quoting.",
        ),
    ),
]


def _guideline(guideline_id: str) -> Guideline:
    return next(g for g in GUIDELINES if g.id == guideline_id)


def _money(value: float) -> str:
    return f"${value:,.0f}"


def _series(parts: list[str]) -> str:
    if len(parts) == 1:
        return parts[0]
    if len(parts) == 2:
        return f"{parts[0]} and {parts[1]}"
    return f"{', '.join(parts[:-1])}, and {parts[-1]}"


def _rationale(guideline_id: str, reason: str, fields: list[str]) -> Rationale:
    guideline = _guideline(guideline_id)
    return Rationale(
        guideline_id=guideline.id,
        title=guideline.title,
        reason=reason,
        severity=guideline.severity,
        fields=fields,
        route=guideline.route,
    )


def _program_tier(bond_amount: float) -> str:
    if bond_amount <= 500_000:
        return "FirstStep"
    if bond_amount <= 1_500_000:
        return "Next Step"
    return "Standard"


def evaluate_guidelines(
    sub: SuretySubmission, flagged: list[dict], threshold: float
) -> list[Rationale]:
    rationales: list[Rationale] = []

    low_confidence = [f for f in flagged if f.get("confidence") is not None]
    if low_confidence:
        fields = [f["path"] for f in low_confidence]
        details = [
            f"{f['path']} confidence {float(f['confidence']):.2f}" for f in low_confidence
        ]
        rationales.append(
            _rationale(
                "UW-01",
                f"{_series(details)} below the {threshold:.2f} threshold.",
                fields,
            )
        )

    unscored = [f for f in flagged if f.get("confidence") is None]
    if unscored:
        fields = [f["path"] for f in unscored]
        rationales.append(
            _rationale(
                "UW-02",
                f"{_series(fields)} populated without model-reported confidence, so review is required.",
                fields,
            )
        )

    if sub.working_capital is not None and sub.bond_amount:
        required_capital = 0.10 * sub.bond_amount
        if sub.working_capital < required_capital:
            rationales.append(
                _rationale(
                    "UW-03",
                    (
                        f"Working capital is {_money(sub.working_capital)} vs bond amount "
                        f"{_money(sub.bond_amount)}. 10% of the bond amount is "
                        f"{_money(required_capital)}, so underwriter judgment is required."
                    ),
                    ["working_capital", "bond_amount"],
                )
            )

    if sub.bond_amount:
        tier = _program_tier(sub.bond_amount)
        rationales.append(
            _rationale(
                "UW-04",
                f"Bond amount {_money(sub.bond_amount)} maps to the {tier} program tier.",
                ["bond_amount"],
            )
        )

    wip_findings: list[str] = []
    for row in sub.wip_schedule:
        project_findings: list[str] = []
        if row.billings_to_date is not None and row.billings_to_date > row.contract_amount:
            project_findings.append(
                f"billings {_money(row.billings_to_date)} exceed contract amount "
                f"{_money(row.contract_amount)}"
            )
        if row.cost_to_date is not None and row.cost_to_date > row.total_estimated_cost:
            project_findings.append(
                f"cost to date {_money(row.cost_to_date)} exceeds total estimated cost "
                f"{_money(row.total_estimated_cost)}"
            )
        if project_findings:
            wip_findings.append(f"{row.project_name}: {_series(project_findings)}")

    if wip_findings:
        rationales.append(
            _rationale(
                "UW-05",
                f"WIP review required for {_series(wip_findings)}.",
                ["wip_schedule"],
            )
        )

    return rationales
