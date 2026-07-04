with inserted_item as (
    insert into review_items (
        id,
        created_at,
        model_id,
        status,
        document_text,
        submission,
        flagged_fields
    )
    values (
        '69fd0d9bfd79',
        to_timestamp(1783031317.3479419),
        'nemotron-free',
        'resolved',
        $doc$From: Dana Whitfield, Whitfield Surety Agency
To: Underwriting
Subject: Perf/Payment bond request - Riverbend Grading & Paving

Hi team - please review the attached for a performance & payment bond on the
below. Principal is Riverbend Grading & Paving LLC (EIN 47-1183920), 1420 Delaware
St, Cedar Falls IA. Obligee is the City of Cedar Falls. Contract / penal sum is
$2,400,000 (2.4M). Financials off the 12/31 CPA-reviewed: working capital about
$850k, net worth ~$3.2M.

Current WIP:
  - Cedar Falls St. Reconstruction Ph 2   contract 2,400,000   est cost 2,010,000   ~15% complete   billed 300,000
  - Blackhawk County Culvert Repairs      contract   680,000   est cost   540,000   ~60% complete   billed 455,000

Let me know if you need the full financials. Thanks!
$doc$,
        $json${
  "principal": {
    "name": "Riverbend Grading & Paving LLC",
    "address": null,
    "fein": "47-1183920"
  },
  "obligee": {
    "name": "City of Cedar Falls",
    "address": null,
    "fein": null
  },
  "bond_type": "other",
  "bond_amount": 2400000.0,
  "working_capital": 850000.0,
  "net_worth": 3200000.0,
  "wip_schedule": [
    {
      "project_name": "Cedar Falls St. Reconstruction Ph 2",
      "contract_amount": 2400000.0,
      "total_estimated_cost": 2010000.0,
      "cost_to_date": null,
      "percent_complete": null,
      "billings_to_date": 300000.0,
      "over_under_billing": null
    },
    {
      "project_name": "Blackhawk County Culvert Repairs",
      "contract_amount": 680000.0,
      "total_estimated_cost": 540000.0,
      "cost_to_date": null,
      "percent_complete": null,
      "billings_to_date": 455000.0,
      "over_under_billing": null
    }
  ],
  "field_confidences": {
    "bond_amount": 1.0,
    "bond_type": 0.8,
    "principal": 1.0,
    "obligee": 1.0,
    "working_capital": 0.8,
    "net_worth": 0.8,
    "wip_schedule": 1.0
  },
  "notes": "Bond type is both performance and payment; entered as 'other'. Working capital and net worth are approximate values. Percent complete for WIP projects is approximate."
}$json$::jsonb,
        $json$[
  {
    "path": "principal.name",
    "value": "Riverbend Grading & Paving LLC",
    "confidence": null
  },
  {
    "path": "principal.fein",
    "value": "47-1183920",
    "confidence": null
  },
  {
    "path": "obligee.name",
    "value": "City of Cedar Falls",
    "confidence": null
  }
]$json$::jsonb
    )
    on conflict (id) do nothing
    returning id
)
insert into review_decisions (item_id, field_path, action, override_value, decided_at)
select inserted_item.id, seed.field_path, seed.action, seed.override_value, seed.decided_at
from inserted_item
cross join (
    values
        (
            'principal.name',
            'approve',
            'null'::jsonb,
            to_timestamp(1783031356.809404)
        ),
        (
            'principal.fein',
            'override',
            $json$"87-3321456"$json$::jsonb,
            to_timestamp(1783031356.809408)
        ),
        (
            'obligee.name',
            'approve',
            'null'::jsonb,
            to_timestamp(1783031356.8094091)
        )
) as seed(field_path, action, override_value, decided_at);

insert into review_items (
    id,
    created_at,
    model_id,
    status,
    document_text,
    submission,
    flagged_fields,
    rationales
)
values (
    'a3d81c22f0e4',
    to_timestamp(1783486800.0),
    'nemotron-free',
    'pending',
    $doc$From: Marisol Keene, Heartland Bond Brokers
To: Contract Surety Underwriting
Subject: Performance bond request - Pine Ridge Sitework LLC

Team,

Please review Pine Ridge Sitework LLC for a performance bond on the Linn County Secondary Roads culvert and trail access package. Obligee is Linn County Secondary Roads. Requested bond amount is $1,850,000.

Principal: Pine Ridge Sitework LLC
FEIN: 82-4471956
Financials: working capital $145,000, net worth $940,000.

Current WIP:
  - Marion Trail Phase 1   contract 620,000   est cost 585,000   billed 640,000

Broker view: contractor has strong local references, but liquidity is thin for this bond size and the WIP billing needs review before quote.
$doc$,
    $json${
  "principal": {
    "name": "Pine Ridge Sitework LLC",
    "address": null,
    "fein": "82-4471956"
  },
  "obligee": {
    "name": "Linn County Secondary Roads",
    "address": null,
    "fein": null
  },
  "bond_type": "performance",
  "bond_amount": 1850000.0,
  "working_capital": 145000.0,
  "net_worth": 940000.0,
  "wip_schedule": [
    {
      "project_name": "Marion Trail Phase 1",
      "contract_amount": 620000.0,
      "total_estimated_cost": 585000.0,
      "cost_to_date": null,
      "percent_complete": null,
      "billings_to_date": 640000.0,
      "over_under_billing": null
    }
  ],
  "field_confidences": {
    "principal.name": 0.97,
    "principal.fein": 0.62,
    "obligee.name": 0.9,
    "bond_type": 0.95,
    "bond_amount": 0.93,
    "working_capital": 0.68,
    "net_worth": 0.88
  },
  "notes": null
}$json$::jsonb,
    $json$[
  {
    "path": "principal.fein",
    "value": "82-4471956",
    "confidence": 0.62
  },
  {
    "path": "working_capital",
    "value": 145000.0,
    "confidence": 0.68
  }
]$json$::jsonb,
    $json$[
  {
    "guideline_id": "UW-01",
    "title": "Confidence floor",
    "reason": "principal.fein confidence 0.62 and working_capital confidence 0.68 below the 0.75 threshold.",
    "severity": "route",
    "fields": [
      "principal.fein",
      "working_capital"
    ],
    "route": "Human review queue"
  },
  {
    "guideline_id": "UW-03",
    "title": "Liquidity check",
    "reason": "Working capital is $145,000 vs bond amount $1,850,000. 10% of the bond amount is $185,000, so underwriter judgment is required.",
    "severity": "route",
    "fields": [
      "working_capital",
      "bond_amount"
    ],
    "route": "Underwriter judgment"
  },
  {
    "guideline_id": "UW-04",
    "title": "Program fit",
    "reason": "Bond amount $1,850,000 maps to the Standard program tier.",
    "severity": "info",
    "fields": [
      "bond_amount"
    ],
    "route": "Informational"
  },
  {
    "guideline_id": "UW-05",
    "title": "WIP consistency",
    "reason": "WIP review required for Marion Trail Phase 1: billings $640,000 exceed contract amount $620,000.",
    "severity": "route",
    "fields": [
      "wip_schedule"
    ],
    "route": "Underwriter judgment"
  }
]$json$::jsonb
)
on conflict (id) do nothing;
