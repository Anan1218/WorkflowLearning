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
    purpose: str
    procedure: list[str]
    escalation: str
    owner: str
    version: str


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
        purpose=(
            "Extraction output is a model's reading, not a verified fact. The floor guarantees "
            "a person verifies anything the model is not sure it read correctly."
        ),
        procedure=[
            "Open the flagged field and its source citation side by side.",
            "Confirm the value against the cited passage; scan for a conflicting later value in the document.",
            "Approve to accept the extracted value as read, or type the corrected value and override.",
            "The decision is recorded with reviewer and timestamp; the pair joins the training set.",
        ],
        escalation=(
            "If the source document itself is ambiguous or contradictory, route the file to the "
            "assigning underwriter rather than guessing, and note the ambiguity on the item."
        ),
        owner="Intake review team",
        version="v2 · effective Mar 2026",
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
        purpose=(
            "A value without a reported confidence has not been vouched for by anything. Silence "
            "is treated as risk: unscored never means unchecked."
        ),
        procedure=[
            "Treat the field exactly as a below-floor field: verify it against the source citation.",
            "If the value is correct, approve; the approval, not the model, is what marks it verified.",
            "If no supporting passage exists in the document, override with the correct value or clear it.",
        ],
        escalation=(
            "Repeated unscored output from one model or document type is an eval problem, not a "
            "review problem: flag it to the pipeline owner for a calibration pass."
        ),
        owner="Intake review team",
        version="v1 · effective Jan 2026",
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
        purpose=(
            "Working capital is the contractor's cushion for absorbing a problem mid-job. Below "
            "10% of the bond, one bad month can become a claim, so the ratio demands judgment, "
            "never auto-approval."
        ),
        procedure=[
            "Recompute the ratio from verified figures once extraction flags clear: working capital over bond amount.",
            "Review what the ratio hides: bank line availability, receivables aging, seasonality of the trade.",
            "Waive with a note when compensating strength exists (strong equity, committed bank line), or hold the file pending updated financials.",
        ],
        escalation=(
            "Waivers on bonds above $1,000,000 need a second underwriter's initials on the "
            "decision entry."
        ),
        owner="Contract surety underwriting",
        version="v4 · effective Jan 2026",
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
        purpose=(
            "The bond amount decides which program the file belongs to, and the program decides "
            "what the file must contain and who can approve it. Classifying early stops a "
            "Standard-sized file from being worked like a FirstStep app."
        ),
        procedure=[
            "Map the bond amount to a tier: FirstStep to $500K, Next Step to $1.5M, Standard above.",
            "Confirm aggregate exposure stays inside the tier: sum the principal's open bonds, not just this one.",
            "Stamp the tier on the file; completeness (UW-06) reads it downstream.",
        ],
        escalation=(
            "Files within 10% of a tier boundary, or with a growing aggregate, go to the "
            "underwriter for tier discretion. Graduation between programs is a relationship "
            "decision, not an arithmetic one."
        ),
        owner="Contract surety underwriting",
        version="v3 · effective Jan 2026",
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
        purpose=(
            "The WIP schedule is where contractor trouble shows first. Overbilling and cost "
            "overruns appear in the rows months before they reach the financial statements."
        ),
        procedure=[
            "Check each row: billings against contract amount, cost to date against total estimated cost.",
            "For flagged rows, distinguish front-loaded billing, which is common and sometimes fine, from genuine profit fade.",
            "Request the current month's WIP when the schedule is older than 90 days; note findings on the file.",
        ],
        escalation=(
            "Two or more flagged rows, or any single row failing both checks, goes to the "
            "underwriter with the WIP attached. Multi-row anomalies are never waived at intake."
        ),
        owner="Contract surety underwriting",
        version="v2 · effective Feb 2026",
    ),
    Guideline(
        id="UW-06",
        title="Completeness",
        severity="route",
        route="Human review queue",
        rule=(
            "The program tier implied by the bond amount sets what the file must contain. "
            "Anything missing is named, and the submission cannot be quoted until it is "
            "supplied or waived."
        ),
        example=GuidelineExample(
            given="A $1,850,000 bond with no WIP schedule attached.",
            outcome=(
                "Routed for completeness: the Standard file requires CPA financials and a "
                "WIP schedule."
            ),
        ),
        purpose=(
            "Chasing missing documents is the largest source of quote delay. Naming the gap on "
            "day one, in the program tier's terms, is how a file gets review-ready in one pass "
            "instead of three."
        ),
        procedure=[
            "Read the tier stamped by UW-04 and load its checklist: Standard requires CPA financials (working capital and net worth) and a WIP schedule; Next Step requires financials covering one of working capital or net worth; FirstStep requires the application alone.",
            "Name each missing item as a reviewable entry on the file.",
            "Supply the value from documents on hand (override) or waive with a reason; the file cannot be quoted while entries are open.",
            "Draft the broker follow-up naming exactly what is missing. In production this draft is generated automatically.",
        ],
        escalation=(
            "Waiving a Standard-tier requirement needs the underwriter who owns the account, not "
            "intake review."
        ),
        owner="Intake review team with underwriting sign-off",
        version="v1 · effective Jun 2026",
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

    if sub.bond_amount:
        tier = _program_tier(sub.bond_amount)
        missing: list[str] = []
        if tier == "Standard":
            if sub.working_capital is None:
                missing.append("working_capital")
            if sub.net_worth is None:
                missing.append("net_worth")
            if len(sub.wip_schedule) == 0:
                missing.append("wip_schedule")
        elif tier == "Next Step":
            if sub.working_capital is None and sub.net_worth is None:
                missing = ["working_capital", "net_worth"]

        if missing:
            rationales.append(
                _rationale(
                    "UW-06",
                    f"Missing for the {tier} file: {_series(missing)}.",
                    missing,
                )
            )

    return rationales
