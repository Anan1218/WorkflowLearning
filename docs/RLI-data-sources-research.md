# RLI data-sources research (behind the dashboard's Sources view)

Consolidated from three parallel deep-research passes (2026-07-02, gpt-5.5 via Codex with web search). Every claim is tagged **CONFIRMED** (public source), **INDUSTRY-STANDARD** (canonical surety practice, cited), or **INFERRED** (reasonable assumption, flagged as such). The Sources view renders these provenance tags on every card - the honesty is the credibility.

## 1. RLI's confirmed intake surfaces (agent-facing)

| System | What it is | Status |
|---|---|---|
| **Agent & Broker Portal** (myportal.rlicorp.com) | Issue/search bonds, agency reports, renewals, forms, fillable applications, payments | CONFIRMED |
| **My Contract Bond App** | Contract-surety online intake: prequal/bid/performance & payment applications; e-signed GIAs with **KBA/government-ID indemnitor verification**; contract & bond document upload; agent-branded contractor links | CONFIRMED |
| **RLink** | Commercial transactional surety platform: automated underwriting, rating, submission, issuance; "instant access to business reports" | CONFIRMED |
| **MyBondApp** | Agent-branded customer-facing bond purchase site, serviced through RLink; embeddable link (a web handoff, not an API) | CONFIRMED |
| Agent-facing API / EDI / IVANS / AMS bridge for surety | None found publicly | NOT CONFIRMED - email + portal is the real intake path |
| "RLI Express" | Does not exist as a surety platform name; real program names below | NOT CONFIRMED |

**Underwriting programs (govern what data arrives):** FirstStep, Next Step, Standard, SBA Capacity - CONFIRMED. Standard expects "professional presentations" incl. third-party **CPA-prepared financial statements**; Next Step may not require CPA statements; FirstStep uses minimal underwriting info. This tiering drives the Sources view's program filter.

Sources: rlicorp.com/surety-bonds (overview, commercial, contract, my-contract-bond-app, mybondapp, agents-brokers/surety-bond-resources), rlicorp.com eGIA article, londonuw.com RLI pages.

## 2. RLI internal systems

| Area | Finding | Status |
|---|---|---|
| Surety platforms | RLink / MyBondApp / My Contract Bond App (above) | CONFIRMED |
| Specialty P&C front office | Contrac Pac QuickWrite - quote/bind/service with **agency downloads to Applied, AMS, and HawkSoft** (evidence AMS connectivity exists at RLI, P&C side) | CONFIRMED |
| Payments | Paymentus for policyholder payments | CONFIRMED |
| Claims intake | Formstack web forms (claims core system not public) | CONFIRMED (intake only) |
| Cloud/stack | .NET shop: Senior/Lead .NET postings with Azure preferred; Cloud Solutions Architect role scoped to Azure-led modernization; portal exposes `RLI.InsuredPortal.Experience.Client.Wasm` (Blazor WebAssembly) | CONFIRMED via job postings + portal artifacts |
| Core PAS / billing / claims / DW vendors | Not public (2017 Sapiens StoneRiver Stream billing selection could not be re-verified) | NOT CONFIRMED |

Implication for the pitch: deployment story = Azure (AI Foundry for models, Durable Functions + Service Bus for orchestration - see LESSONS.md), and integration points are presented generically ("bond system of record") rather than naming vendors we can't verify.

## 3. External enrichment feeds (industry-standard - RLI's vendors are not public)

| Feed | Practice | Status |
|---|---|---|
| Business credit + legal events | D&B (credit, liens, judgments, bankruptcies, UCC); Experian Business as peer | INDUSTRY-STANDARD |
| Owner personal credit | Bureau pull on owners/indemnitors for fast-track/transactional surety; **FCRA**: permissible purpose + written consent (cf. SBA Form 994 authorization), adverse-action notices on declines; soft pull commercially preferable | INDUSTRY-STANDARD, legally grounded (15 U.S.C. §1681b, §1681m) |
| Public records / entity linkage | LexisNexis Accurint for Insurance - **explicitly not an FCRA consumer report; cannot be a sole eligibility factor** (investigative use with independent verification) | INDUSTRY-STANDARD with documented caveat |
| UCC / liens / courts | State Secretary of State UCC searches; county/state courts; **PACER** for federal civil + bankruptcy; aggregators (LexisNexis, D&B, Experian, TR CLEAR) | INDUSTRY-STANDARD |
| WIP schedules / financials | SBA Form 994F (WIP/backlog: contract price, billed-to-date, cost-to-date, cost-to-complete); SBA accepts internally-prepared, CPA-compiled/reviewed statements, tax returns, interims, **XBRL spreadsheet WIP upload** - i.e., Excel-like WIP schedules are documented practice | CONFIRMED via SBA SOP 50 45 4 |
| Bank/LOC verification | SBA requires bank-signed line-of-credit evidence (amount, availability, collateral, expiration) | CONFIRMED via SBA |
| Project history verification | Internal file history, references, public bid tabs, SAM.gov/USAspending for federal work; Dodge/Blue Book/ConstructConnect as plausible commercial feeds | INDUSTRY-STANDARD / plausible |

## Source index

- RLI: rlicorp.com/surety-bonds · /surety-bonds/commercial-surety · /surety-bonds/contract-surety · /surety-bonds/contract-surety/my-contract-bond-app · /surety-bonds/commercial-surety/mybondapp · /resources/agents-brokers/surety-bond-resources · eGIA article · /specialty-insurance/construction/contrac-pac-quickwrite · /login-payments · /claims · careers.rlicorp.com/it
- SBA: sba.gov/funding-programs/surety-bonds · Form 994 · Form 994F · SOP 50 45 4
- FCRA: 15 U.S.C. §1681b (permissible purposes) · §1681m (adverse action)
- PACER: pacer.uscourts.gov · LexisNexis: risk.lexisnexis.com/products/accurint-for-insurance
- Distribution: londonuw.com RLI pages · job boards (Glassdoor/Built In/ZipRecruiter/peoria.org) for stack evidence
