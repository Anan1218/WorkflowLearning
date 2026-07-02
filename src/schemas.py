"""The data contract.

Pydantic v2 models are the single source of truth for what a surety submission
*is*. Instructor validates the LLM's output against these on the way out (and
re-asks the model if validation fails), and the eval harness scores extracted
values against ground truth of the same shape.

Surety is deliberately modeled first-class (principal / obligee / bond / the
Work-in-Progress schedule) because that is exactly the structure a generic
insurance platform does NOT have - it's the RLI wedge.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class BondType(str, Enum):
    bid = "bid"
    performance = "performance"
    payment = "payment"
    maintenance = "maintenance"
    # commercial surety (non-contract)
    license_permit = "license_permit"
    court = "court"
    fidelity = "fidelity"
    other = "other"


class Party(BaseModel):
    """A named party on the bond (principal or obligee)."""

    name: str
    address: str | None = None
    fein: str | None = Field(default=None, description="Federal Employer ID (EIN), digits only")


class WIPProject(BaseModel):
    """One row of a contractor's Work-in-Progress schedule.

    The WIP is the crown-jewel surety document: dynamic, project-level financials
    (not a static balance sheet). Under/over-billings are the tell.
    """

    project_name: str
    contract_amount: float = Field(description="Total contract incl. approved change orders, USD")
    total_estimated_cost: float
    cost_to_date: float | None = None
    percent_complete: float | None = Field(default=None, ge=0, le=100)
    billings_to_date: float | None = None
    # underbillings (contract asset) if positive, overbillings (liability) if negative
    over_under_billing: float | None = None


class SuretySubmission(BaseModel):
    """The structured record extracted from a raw surety submission document."""

    principal: Party = Field(description="The contractor/business being bonded")
    obligee: Party | None = Field(default=None, description="Who requires the bond")
    bond_type: BondType
    bond_amount: float | None = Field(default=None, description="Penal sum / bond amount, USD")

    # Contractor financials the underwriter keys on
    working_capital: float | None = None
    net_worth: float | None = None
    wip_schedule: list[WIPProject] = Field(default_factory=list)

    # Per-field confidence [0,1] the model assigns to its own extractions.
    # Keys are dotted field paths (e.g. "principal.fein", "bond_amount").
    # Low-confidence fields are the ones a confidence-thresholded HITL queue
    # would route to a human. See evals/scorers.py for how this is graded.
    field_confidences: dict[str, float] = Field(default_factory=dict)

    notes: str | None = Field(default=None, description="Anything ambiguous or worth a human's eye")


# Fields the scorer checks for per-field accuracy. Kept explicit (not reflected)
# so the eval metric is stable and readable - it IS the DSPy optimizer metric later.
SCORED_FIELDS: tuple[str, ...] = (
    "principal.name",
    "principal.fein",
    "obligee.name",
    "bond_type",
    "bond_amount",
    "working_capital",
    "net_worth",
    "wip_total_contract_value",  # derived: sum of wip_schedule contract_amounts
)
