/** Plain-language glossary for RLI / surety / compliance / pipeline jargon.
 *  Definitions verified against rlicorp.com, SBA, FTC/FCRA, LexisNexis, PACER
 *  sources; see docs/RLI-data-sources-research.md and the term-by-term source
 *  list in the research notes. Rendered via <Term>/<GlossaryText>. */

export type GlossaryEntry = {
  term: string;
  aliases?: string[];
  def: string;
};

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // ---- RLI programs (limits per rlicorp.com contract-surety) ----
  firststep: {
    term: "FirstStep",
    def: "RLI's entry contract-surety program for contractors with small or infrequent bond needs: minimal underwriting information, single bonds or aggregate programs up to $500,000.",
  },
  "next step": {
    term: "Next Step",
    def: "RLI's mid-tier contract-surety program for needs from $500,000 to $1.5 million. CPA-prepared financial statements may not be required.",
  },
  standard: {
    term: "Standard",
    def: "RLI's full-underwriting program for well-established contractors ($1.5M and above): professional presentations including third-party CPA-prepared financial statements.",
  },
  "sba capacity": {
    term: "SBA Capacity",
    def: "RLI's use of the SBA's Prior Approval Bond Guarantee Program for small, emerging contractors. The SBA guarantees the bond, up to $9M single size ($14M on federal projects).",
  },
  // ---- RLI systems ----
  "my contract bond app": {
    term: "My Contract Bond App",
    def: "RLI's online contract-bond application tool: prequalification, bid, and performance/payment applications with e-signed documents (including GIAs), uploads, and agent-branded contractor links.",
  },
  rlink: {
    term: "RLink",
    def: "RLI's online platform for high-volume transactional commercial surety, with automated underwriting for streamlined rating, submission, and issuance.",
  },
  mybondapp: {
    term: "MyBondApp",
    def: "RLI's agent-branded customer-facing site where a contractor or business can apply for and purchase commercial bonds online; serviced through RLink.",
  },
  quickwrite: {
    term: "QuickWrite",
    def: "RLI's online quote/bind/servicing platform on the P&C construction side. It matters here because it confirms RLI already runs agency downloads to Applied, AMS360, and HawkSoft.",
  },
  "bond system of record": {
    term: "Bond system of record",
    aliases: ["system of record", "PAS"],
    def: "The carrier's core policy administration system: the authoritative database of issued bonds and accounts. Our pipeline reads it for clearance checks; it is never replaced or migrated.",
  },
  // ---- surety concepts ----
  surety: {
    term: "Surety",
    aliases: ["surety bond", "SuretySubmission"],
    def: "A three-party guarantee: the principal promises to perform, the surety (insurer) backs that promise, and the obligee is protected if the principal fails. Unlike normal insurance, the surety expects reimbursement from the principal after a paid claim.",
  },
  principal: {
    term: "Principal",
    def: "The business whose obligation the bond guarantees, usually the contractor applying for the bond in contract surety.",
  },
  obligee: {
    term: "Obligee",
    def: "The party requiring and protected by the bond, often the project owner or a government agency.",
  },
  indemnitor: {
    term: "Indemnitor",
    aliases: ["indemnitors"],
    def: "A person or company that agrees to reimburse the surety for losses on the bond, typically the contractor, its owners (often with spouses), and affiliates.",
  },
  gia: {
    term: "GIA",
    aliases: ["eGIA", "GIAs"],
    def: "General Indemnity Agreement: the contract where the principal and indemnitors promise to repay the surety if a claim arises. An eGIA is the same agreement executed electronically.",
  },
  "bond type": {
    term: "Bond type",
    def: "The obligation being guaranteed. Contract surety: bid (honor your bid), performance (finish the job), payment (pay subs/suppliers), maintenance (post-completion repairs). Commercial surety: license & permit, court, fidelity, notary, and similar compliance bonds.",
  },
  "bond amount": {
    term: "Bond amount",
    def: "Also called the penal sum: the maximum the surety is obligated to pay under the bond. It caps exposure; it is not automatically paid out.",
  },
  "loss runs": {
    term: "Loss runs",
    def: "Reports of a customer's past insurance claims over several years. In surety, the analog is prior bond claims and defaults; a clean history is a strong underwriting signal.",
  },
  wip: {
    term: "WIP schedule",
    aliases: ["WIP", "wip_schedule", "WIP schedules", "work-in-progress"],
    def: "Work-in-Progress schedule: a project-by-project report of contract price, costs to date, billings, and estimated cost to complete. The single most telling document in a surety file: it reveals backlog, profit fade, and billing practices.",
  },
  "under/over-billing": {
    term: "Under/(Over) billing",
    aliases: ["Under/(Over)", "underbilling", "overbilling"],
    def: "Underbilling = the contractor earned more than it billed (can strain cash). Overbilling = billed ahead of the work (a liability, because some collected cash belongs to future work). Underwriters read this column closely.",
  },
  "working capital": {
    term: "Working capital",
    aliases: ["working_capital"],
    def: "Current assets minus current liabilities: the short-term liquidity available to support jobs. Sureties adjust it for weak assets (slow receivables, related-party items) before relying on it.",
  },
  "net worth": {
    term: "Net worth",
    aliases: ["net_worth"],
    def: "Assets minus liabilities: the owners' equity cushion. A key underwriting number alongside working capital, though liquidity and job performance often matter more.",
  },
  cpa: {
    term: "CPA-prepared financials",
    aliases: ["CPA", "CPA-prepared"],
    def: "Financial statements prepared by a Certified Public Accountant, at rising assurance levels: compiled, reviewed, or audited. RLI's Standard program expects third-party CPA-prepared statements.",
  },
  clearance: {
    term: "Clearance",
    aliases: ["dedup"],
    def: "The carrier's check that a submission or account hasn't already been received from another agent. It prevents duplicate competing files and determines which producer controls the account.",
  },
  appetite: {
    term: "Appetite",
    aliases: ["underwriting appetite"],
    def: "The carrier's stated preference for risks it wants to write: bond types, contractor size, geography, financial profile. Submissions outside appetite are declined fast; scoring against it is the triage step.",
  },
  triage: {
    term: "Triage",
    def: "Sorting incoming submissions by fit and urgency. In-appetite deals route to underwriters quickly; out-of-appetite ones get fast, polite declines.",
  },
  quote: {
    term: "Quote",
    def: "The proposed terms and price the carrier offers for a risk. In surety: the bond terms, rate, and any conditions before authorization.",
  },
  binding: {
    term: "Binding",
    def: "Insurance vocabulary; surety people say issue and execute. Bonds are executed by an attorney-in-fact under a power of attorney. Nothing in this pipeline issues a bond; that authority stays human.",
  },
  "completeness review": {
    term: "Completeness review",
    def: "Checking a submission file for required documents and data before underwriting. Missing items are named and chased rather than discovered mid-review.",
  },
  referral: {
    term: "Referral",
    aliases: ["referrals"],
    def: "A case the automated underwriting rules couldn't clear. It is kicked out of the straight-through flow for a human underwriter to review.",
  },
  "straight-through": {
    term: "Straight-through issuance",
    aliases: ["straight-through issuance"],
    def: "A bond issued entirely by automated rules with no human touch; the norm for small transactional commercial bonds (notary, license & permit).",
  },
  "automated underwriting": {
    term: "Automated underwriting",
    def: "Rule- and score-based decisioning (often credit-driven) that approves, rates, and issues eligible bonds without an underwriter. RLink uses it for high-volume transactional surety.",
  },
  "fast-track": {
    term: "Fast-track",
    def: "Low-touch underwriting paths (like FirstStep) that decide primarily on owner credit and minimal information rather than full financial presentations.",
  },
  producer: {
    term: "Producer",
    def: "Industry term for the licensed agent or broker who brings in ('produces') the business.",
  },
  underwriter: {
    term: "Underwriter",
    def: "The carrier-side decision maker who evaluates a submission and decides whether to issue the bond, and on what terms.",
  },
  carrier: {
    term: "Carrier",
    def: "The insurance company taking the risk, here the surety (e.g., RLI). Distinct from the agency/brokerage that sells the bond.",
  },
  "broker sftp": {
    term: "Broker SFTP drop",
    aliases: ["SFTP"],
    def: "A scheduled secure file transfer from a high-volume brokerage: batches of submission packages exported nightly from their agency systems.",
  },
  // ---- compliance / data ----
  npi: {
    term: "NPI",
    def: "Nonpublic Personal Information under the Gramm-Leach-Bliley Act (GLBA): private financial and identity data a financial institution holds, including owner credit, personal financials, and tax data. Triggers safeguarding obligations wherever it flows.",
  },
  pii: {
    term: "PII",
    aliases: ["PII classification", "PII class"],
    def: "Personally Identifiable Information. Each connection here is classified by what flows through it, which drives redaction, retention, and vendor-contract requirements.",
  },
  fcra: {
    term: "FCRA",
    def: "The Fair Credit Reporting Act governs use of consumer credit reports. Pulling an owner's personal credit for underwriting requires a permissible purpose and written consent, and declines based on it require an adverse-action notice.",
  },
  "adverse action": {
    term: "Adverse-action notice",
    aliases: ["adverse-action"],
    def: "The FCRA-required notice when a negative decision relies on consumer-report data. It tells the person which bureau was used and their right to dispute the report.",
  },
  "soft pull": {
    term: "Soft pull",
    def: "A credit check that doesn't affect the person's credit score, preferred for prequalification. A hard pull is tied to a credit decision and can move the score.",
  },
  dpa: {
    term: "DPA",
    def: "Data Processing Agreement: the contract defining how a vendor may handle customer data, including permitted use, security, breach duties, deletion, and audit rights. Required for every subprocessor.",
  },
  "soc 2": {
    term: "SOC 2",
    def: "An independent CPA attestation of a vendor's controls (security, availability, processing integrity, confidentiality, privacy). The standard artifact enterprises request in vendor risk reviews.",
  },
  subprocessor: {
    term: "Subprocessor",
    def: "Any third party a vendor uses to process customer data (hosting, model APIs, OCR...). Enterprise DPAs require these be disclosed and vetted. Fewer subprocessors means a smaller audit surface.",
  },
  kba: {
    term: "KBA",
    aliases: ["KBA-verified"],
    def: "Knowledge-Based Authentication: identity verification via questions drawn from a person's credit/public records (prior addresses, old loans). RLI uses it when indemnitors e-sign GIAs.",
  },
  "processing integrity": {
    term: "Processing integrity",
    def: "One of SOC 2's five Trust Services Criteria: the system processes data completely, accurately, and timely. Our eval harness is the evidence for it: measured accuracy, not vibes.",
  },
  "audit trail": {
    term: "Audit trail",
    aliases: ["audit-trail"],
    def: "The immutable who/what/when record of every decision: model version, inputs, outputs, confidence, and any human override. Regulators and auditors require it; observability alone doesn't satisfy it.",
  },
  lineage: {
    term: "Lineage",
    def: "Tracing every extracted field back to the exact source document and system it came from. It answers an auditor's 'where did this number come from?'",
  },
  // ---- external sources ----
  "d&b": {
    term: "D&B",
    def: "Dun & Bradstreet: business credit and risk data, including legal events like liens, judgments, bankruptcies, and UCC filings, pulled per submission and monitored nightly across the active portfolio.",
  },
  lexisnexis: {
    term: "LexisNexis public records",
    aliases: ["LexisNexis"],
    def: "Public-records and entity-linkage research (Accurint). Important caveat: it is not an FCRA consumer report, so it can inform investigation but cannot be the sole basis for an eligibility decision.",
  },
  ucc: {
    term: "UCC filing",
    aliases: ["UCC"],
    def: "A public financing statement a lender files to claim collateral in a business's assets. UCC searches reveal who already has security interests in the contractor and how leveraged it is.",
  },
  sos: {
    term: "SoS",
    aliases: ["Secretary of State", "State SoS"],
    def: "Secretary of State filing offices, where UCC financing statements and business registrations are searched state by state.",
  },
  pacer: {
    term: "PACER",
    def: "The federal courts' public records system, used to sweep active principals for bankruptcies, federal lawsuits, and judgments.",
  },
  sba: {
    term: "SBA",
    aliases: ["SBA bond guarantee program"],
    def: "The Small Business Administration's Surety Bond Guarantee Program: the SBA guarantees a large share of the bond so sureties can back small, emerging contractors they otherwise couldn't. RLI participates via the Prior Approval track.",
  },
  "994f": {
    term: "Form 994F",
    aliases: ["Forms 994/994F", "994"],
    def: "SBA's Schedule of Work in Process is the standardized WIP form (Form 994 is the guarantee application itself). The SBA even accepts WIP as a machine-readable XBRL spreadsheet.",
  },
  xbrl: {
    term: "XBRL",
    def: "A machine-readable format for tagged financial data. The SBA accepts WIP schedules this way, which is exactly the structured-data direction this pipeline pushes.",
  },
  "sam.gov": {
    term: "SAM.gov",
    def: "The U.S. government's award-management system, used to verify a contractor's claimed federal project history against actual registrations and awards.",
  },
  ams: {
    term: "AMS",
    aliases: ["AMS agency feeds", "Applied Epic", "AMS360", "HawkSoft"],
    def: "Agency Management System: the system of record an insurance agency runs on (clients, policies, documents, accounting). Applied Epic, Vertafore AMS360, and HawkSoft are the common platforms.",
  },
  acord: {
    term: "ACORD",
    def: "The insurance industry's standardized forms. Surety uses them sparingly (ACORD 501 execution report, 502 contract bond request); carrier-proprietary questionnaires and bond request forms dominate contract surety intake.",
  },
  fein: {
    term: "FEIN",
    def: "Federal Employer Identification Number: the IRS tax ID for a business. The key used to identify a principal, dedupe submissions, and match external records.",
  },
  // ---- ML / pipeline terms for the insurance-side viewer ----
  "ground truth": {
    term: "Ground truth",
    def: "The verified correct answer for a document, labeled in advance. Extraction accuracy is measured against it. Every accuracy number in this demo is 'percent of fields matching ground truth.'",
  },
  "labeled training pair": {
    term: "Labeled training pair",
    aliases: ["labeled", "labeled cases"],
    def: "A document paired with its verified correct extraction. Human review corrections become new pairs. Every override makes the eval set (and eventually the model) better.",
  },
  "confidence gate": {
    term: "Confidence gate",
    aliases: ["confidence threshold", "confidence-gated"],
    def: "The model scores its own certainty per field (0-1). Anything below the 0.75 threshold, or unreported, cannot proceed unattended and routes to human review.",
  },
  evals: {
    term: "Evals",
    aliases: ["eval harness", "harness", "eval runs"],
    def: "Automated evaluations: running the extractor over labeled documents and scoring per-field accuracy, latency, and cost. Run before every change; it is the evidence engine behind every claim here.",
  },
  ocr: {
    term: "OCR",
    def: "Optical Character Recognition turns scanned images into text. Scanned/handwritten documents need an OCR + image hybrid step; this demo handles digital text and text-layer PDFs.",
  },
  otel: {
    term: "OTel → Langfuse",
    aliases: ["OTel", "Langfuse"],
    def: "OpenTelemetry (the open tracing standard) shipping every model call, including prompt, tokens, cost, and latency, to Langfuse for inspection. Self-hostable inside a carrier's walls so no document content leaves.",
  },
  "instructor + pydantic": {
    term: "Instructor + Pydantic",
    def: "The extraction backbone: Pydantic defines the typed schema (the data contract) and Instructor forces the model's output to validate against it, automatically re-asking on failure. Plain Python, no framework lock-in.",
  },
};

/** Longest-first list of (matchText, key, caseSensitive) for the auto-linkifier. */
export const MATCHERS: { text: string; key: string; cs: boolean }[] = Object.entries(GLOSSARY)
  .flatMap(([key, e]) => [e.term, ...(e.aliases ?? [])].map((text) => ({ text, key })))
  .map(({ text, key }) => ({ text, key, cs: text === text.toUpperCase() && text.length <= 6 }))
  .sort((a, b) => b.text.length - a.text.length);
