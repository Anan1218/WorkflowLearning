# Building an AI Submission Ingestion & Triage System for Specialty Insurance (RLI)

*A build roadmap + curated resource list. Research verified via multi-source adversarial fact-checking (24/25 key claims confirmed, 1 refuted). Sources cited inline.*

---

## 0. TL;DR for the build

The thing RLI is describing ("get policies in the door, read them, structure the data, decide which to work first, route to the right underwriter, auto-adjudicate the easy ones") is a known, named pattern in commercial insurance: **submission ingestion and triage**, sitting inside the broader **submit-to-quote** workflow. Every serious insurtech (Cytora, Federato, Convr, Sixfold, Roots, Indico) builds the same backbone:

> **Ingest** (email + attachments) → **Classify** documents → **Extract** to a structured schema → **Clear/dedup** against existing book → **Normalize** into one data model (the "golden schema") → **Score against appetite** → **Route / prioritize** → **Straight-through-process** the simple ones, **human-in-the-loop** the rest → **Write back** to the policy admin / mainframe.

The defensible, hard part is **not** the LLM extraction call (that is now commodity). It is (1) the **normalization layer / unified data model** that makes heterogeneous broker inputs queryable, (2) the **appetite/rules engine** encoding RLI's actual underwriting guidelines, and (3) the **legacy write-back** into green-screen systems. That is exactly the "data plane" thesis: the moat is boots-on-the-ground integration, not model cleverness.

For surety specifically, the schema and rules are different in kind, not just degree (Work-in-Progress schedules, bonding capacity, three-party principal/obligee structure), which is precisely why generic platforms underperform there and why an in-house build is justified.

---

## 1. What "submission ingestion and triage" actually means

### The workflow
The submit-to-quote process splits into two phases: **submit-to-triage** and **triage-to-quote** [ResourcePro, Indico]. A standard four-step triage framework: (1) review the submission, (2) qualify the broker, (3) review the insured, (4) review prior relationships [ResourcePro]. Triage itself is "the process of sorting, evaluating, and prioritizing incoming applications," sitting in a flow from receiving submissions → appetite-fit triage → information extraction → risk assessment → pricing → quote/decline/bind [SortSpoke].

A clean five-step automation pipeline (vendor-neutral framing) [Inaza/Indico]:
1. **Ingest** broker submissions from email, portals, uploads.
2. **Group** related documents into a single submission "package."
3. **Extract** underwriting data across all documents.
4. **Validate** completeness and flag inconsistencies.
5. **Route** cleaned data to the underwriting system / underwriter.

### Key terms (the vocabulary RLI's IT team will expect you to know)
- **Submission**: a request from a broker/agent to quote a risk, usually an email plus attachments.
- **ACORD forms**: industry-standard application forms (ACORD is the insurance data-standards body; see §5). The lingua franca of commercial submissions.
- **Loss runs**: the insured's historical claims report. Core to pricing.
- **SOV (Statement of Values)**: schedule of insured properties/assets and their values (big in property).
- **Clearance**: checking whether a submission is new, a duplicate, or tied to an existing deal/relationship, and whether the broker has authority. Dedup. Federato's triage, for example, "checks email and attachments to determine whether the email is a new submission or related to an ongoing deal" [Federato].
- **Appetite**: the carrier's defined set of risks it wants to write. Triage scores a submission's fit against appetite.
- **Declination**: a decline-to-quote. A modern workbench can auto-decline out-of-appetite risks [Guidewire].
- **Bind**: agreeing to provide coverage (the deal closes).
- **STP (Straight-Through Processing)**: "automating an entire workflow, from data entry to final outcome, without human intervention" [Inaza]. The goal for simple/auto-adjudicable risks.
- **Underwriting workbench**: the underwriter's cockpit. Consolidates all incoming broker submissions into a single location for clearance and workflow [Endava case study]; modern ones (e.g. Guidewire UnderwritingCenter) "automatically extract and normalize data from unstructured documents and enrich it via online research" [Guidewire].

---

## 2. Reference architecture for a build-it-yourself system

Think of it as eight layers. Build them as independent, swappable services.

**(1) Intake / ingestion**
Multi-channel by design: email (the dominant channel), plus SFTP, API, and a UI for uploads. Convr's Intake, for instance, accepts submissions "through UI, email, SFTP, or API" and handles "ACORD forms, broker emails, Statements of Values (SOV), loss runs, supplemental applications, and broker-provided forms" [Convr]. Practically: a monitored mailbox (Graph API / Gmail API) → attachment burst-out → object storage (S3) → a queue.

**(2) Document classification**
Before extraction, classify each attachment (ACORD 125 vs loss run vs SOV vs financials vs WIP schedule). Few-shot prompting against an LLM works well here; AWS's reference pipeline does document classification as an explicit phase using few-shot prompting [AWS ML Blog].

**(3) IDP / OCR layer (the "read the page" step)**
Turn pixels/PDF into text + layout + tables + key-value pairs. Amazon Textract "extracts unstructured raw text and preserves semi-structured/structured objects like key-value pairs and tables" and handles handwriting [AWS ML Blog]. This is your fallback for scans, faxes, and handwritten endorsements. For clean digital PDFs, modern multimodal LLMs can often read directly without a separate OCR pass.

**(4) LLM extraction → structured schema**
Map the read text into a typed JSON schema (your fields: named insured, FEIN, locations, limits, loss history, etc.). The canonical pattern: Textract for OCR + Bedrock/Claude LLMs orchestrated through an orchestration layer, covering classification, summarization, normalization, Q&A, and correction [AWS ML Blog]. Open-source **Unstract** does exactly this end to end: "uses LLMs to extract structured JSON from documents (PDFs, images, scans); define what you want with natural-language prompts; deploy as an API or ETL pipeline" [Unstract/GitHub].

> ⚠️ **Verified pitfall (a claim our research actively refuted):** do NOT treat LLM schema extraction as "deterministic." The AWS source explicitly states LLM output is *non-deterministic*, which is why the pipeline wraps extraction in validation and format-enforcement, not why it is exact. Build for variance: schema validation, type checks, confidence scoring, and retries. See §6.

**(5) Normalization / the "data plane" (your moat)**
Heterogeneous inputs (PDF, spreadsheets, emails, broker APIs "with varying schemas") get normalized into one canonical model. Cytora's whole design centers on this: it maintains "a list of semantically meaningful (and computer-readable) target fields and field values" and ships "baseline risk-taxonomy golden schemas" per commercial line [Cytora / Google Cloud]. This is the layer that makes cross-department, multi-system work possible, and the one a generic vendor cannot tailor to surety for you. Build it as a versioned canonical schema + mapping/transform service.

**(6) Clearance / dedup engine**
Entity resolution against the existing book (fuzzy match on named insured, FEIN, address, broker) to decide new vs duplicate vs renewal, plus broker-authority checks.

**(7) Appetite / triage / scoring engine**
Encode RLI's underwriting guidelines as rules + a model. Sixfold's approach: "ingest the carrier's unique underwriting guidelines and automatically surface submissions that match the carrier's risk appetite" [Sixfold]. A pragmatic phased rollout (Cytora's own how-to): Stage 1, capture just 5-7 key data points to filter out-of-appetite submissions at intake; Stage 2, expand to 10-20 fields with third-party enrichment; Stage 3, full automatic risk profiling [Cytora how-to]. Retrieve guidelines via RAG so underwriters can update rules without redeploying code.

**(8) Routing, HITL, STP, and legacy write-back**
Auto-decline clear out-of-appetite risks [Guidewire], auto-adjudicate/STP the clean simple ones, route the rest to the right underwriter with a confidence-ranked work queue. Then the hard mile: write structured output back into the legacy policy admin / mainframe. ~74% of insurers still run pricing/underwriting on legacy cores, and ~70% of IT budgets go to maintaining them; these mainframe/COBOL systems "weren't designed for real-time orchestration, intelligent workflows, or AI agents," so you need an integration/modernization layer (APIs, middleware, and where there is no API, screen-automation/RPA against the green-screen 3270 terminal) [Superblocks, Decerto]. Treat the green-screen as just another adapter behind your data plane.

---

## 3. Tech stack to learn (concrete)

**LLM structured extraction**
- Anthropic Claude / OpenAI **tool use / function calling** and **JSON-schema / structured-output** modes. This is the core skill: force the model to emit a validated object, not prose.
- Read the Anthropic "tool use" and structured-output docs; build a tiny extractor that takes an ACORD PDF and returns typed JSON with per-field confidence.

**OCR / IDP options (pick per document quality)**
- **AWS Textract** (text + tables + KV + handwriting; AmazonTextractPDFLoader for orchestration) [AWS].
- **Azure AI Document Intelligence**, **Google Document AI**: equivalent managed IDP.
- **Open source**: docTR, Surya, PaddleOCR for self-hosted OCR; increasingly, multimodal LLMs read clean PDFs directly.

**Orchestration**
- An orchestration layer to chain classify → OCR → extract → validate (the AWS reference uses LangChain; you can use your own lightweight orchestrator). Keep each step a discrete, testable service.

**Vector DB / RAG (for appetite + guideline retrieval)**
- Qdrant, Pinecone, Weaviate, PostgreSQL/pgvector, or Milvus (all supported by Unstract, a good compatibility shortlist) [Unstract].

**Reference platforms to study (open source)**
- **Unstract** (github.com/Zipstack/unstract, AGPL-3.0, ~6.7k stars): closest open-source mirror of what you'd build. Prompt-defined extraction → JSON → API/ETL, multi-LLM (OpenAI, Claude, Bedrock, Gemini, Ollama, Mistral) and multi-vector-DB [Unstract].

**Legacy integration**
- Learn 3270 terminal emulation / screen-scraping and RPA patterns for systems with no API; API/middleware wrappers where one exists [Decerto, Superblocks].

---

## 4. Surety & specialty-line specifics (why generic platforms fail here)

**Surety is structurally different from P&C.** A surety bond is a **three-party** written agreement: the **surety** guarantees the **obligee** that the **principal** will perform per the bond/contract [SFAA / surety.org]. Two categories: **contract** surety and **commercial** surety [SFAA]. Your data model needs principal, obligee, bond type, and bond amount as first-class entities, none of which exist in a standard P&C submission schema.

**The Work-in-Progress (WIP) schedule is the surety equivalent of loss runs, and it is the crown jewel.** It is "one of the most important" surety underwriting documents, listing per-project: contract amount (incl. change orders), total estimated cost, gross profit, progress to date, inception-to-date revenue/costs, **underbillings** (contract assets) and **overbillings** (contract liabilities) [IRMI, CommercialSurety]. These are dynamic, project-level financials, not the static balance sheet/income statement P&C underwriting leans on. Extracting and reconciling WIP schedules (often messy Excel/PDF from contractors' accountants) is a high-value, surety-specific extraction target.

**Bonding capacity** (single + aggregate) is computed from the WIP plus financial statements, working capital, and net worth. An auto-triage system for surety must compute remaining capacity, not just classify a risk.

**Trucking / transportation** (another RLI line) has its own external data spine: 92% of commercial trucking underwriters use **FMCSA CSA/SMS** safety data in pricing, sourced from public BASIC percentile rankings plus raw MCMIS violation data [Foley]. So the "appetite engine" for transportation needs a live FMCSA data integration, a totally different enrichment source than property or casualty.

**Implication for the pitch:** the per-line **golden schema** and the **appetite rules** are where the custom work lives. That is defensible, recurring integration work, exactly the land-and-expand surface.

---

## 5. Curated learning resources (start this week)

**Domain / workflow (read first)**
- SortSpoke, "Insurance Submission Triage Explained" - vendor-neutral, term-by-term. *(blog)* https://sortspoke.com/blog/underwriting-submission-triage-explained
- Indico, "Underwriting Triage and Clearance" *(blog)* https://indicodata.ai/underwriting-triage-and-clearance/
- ResourcePro, "Improve Submit-to-Quote with Submission Triage" - the 4-step framework. https://www.resourcepro.com/blog/how-insurers-can-improve-submit-to-quote-with-submission-triage/
- Inaza, "Straight-Through Processing in Insurance" - STP defined. https://www.inaza.com/blog/straight-through-processing-in-insurance-a-comprehensive-guide-to-true-stp
- Guidewire UnderwritingCenter (workbench reference) https://www.guidewire.com/products/core-products/insurancesuite/underwritingcenter-insurance-underwriting-software
- Endava case study, underwriting workbench build https://www.endava.com/case-studies/creating-underwriting-workbench-for-global-insurer-to-streamline-submissions-and-improve-workflow

**Architecture / implementation (the buildable patterns)**
- ⭐ AWS ML Blog, "Intelligent document processing with Amazon Textract, Amazon Bedrock, and LangChain" - closest cloud reference to RLI's pipeline. *(primary)* https://aws.amazon.com/blogs/machine-learning/intelligent-document-processing-with-amazon-textract-amazon-bedrock-and-langchain/
- AWS, "IDP with AWS AI Services in Insurance (Part 1)" - capture/classify/extract then enrich/review/verify stages. https://aws.amazon.com/blogs/machine-learning/part-1-intelligent-document-processing-with-aws-ai-services-in-the-insurance-industry/
- ⭐ Unstract (open-source IDP→JSON platform) - read the repo as a blueprint. *(primary)* https://github.com/Zipstack/unstract
- Federato, "Submission Triage: How It Works" https://www.federato.ai/articles/submission-triage-how-it-works

**Vendor architecture / case studies (how the leaders describe it)**
- ⭐ Google Cloud, "Cytora uses generative AI to assess underwriting risk" - the most detailed public architecture (golden schema, chain-of-thought, per-customer models). *(primary)* https://cloud.google.com/blog/topics/financial-services/cytora-uses-generative-ai-to-assess-underwriting-risk
- Cytora, "Introducing Platform 3.0" - multi-agent LLM digitizers; ingestion→enrichment→routing + autonomous execution. https://www.cytora.com/risk-flow-center/blog/introducing-cytora-platform-3-0
- Cytora, "Deploying Digital Risk Flows: a how-to" - the phased 5-7 → 10-20 → full-profiling rollout. https://www.cytora.com/risk-flow-center/blog/deploying-digital-risk-flows-a-how-to-guide
- Convr Intake (channels + doc types) https://convr.com/intake
- Roots, "AI Insurance Submission Intake" https://www.roots.ai/blog/ai-insurance-submission-intake-from-document-intake-chaos-straight-through-processing
- Sixfold, "AI features for commercial/specialty underwriting" https://www.sixfold.ai/content/post/ai-features-commerical-specialty-underwriting

**Surety & specialty**
- SFAA / surety.org, "What is Surety" - three-party structure, contract vs commercial. *(primary)* https://surety.org/surety-fidelity/what-is-surety/
- IRMI, "Surety Outlook and Underwriting Changes in Work-in-Progress" - how underwriters read WIP. https://www.irmi.com/articles/expert-commentary/surety-outlook-and-underwriting-changes-in-work-in-progress
- CommercialSurety, "What Sureties Look For in Your WIP Schedule" https://commercialsurety.com/what-sureties-look-for-in-your-work-in-progress-schedule/
- Foley, "CSA Score & Insurance Rates" (trucking/FMCSA data) https://www.foleyservices.com/articles/csa-score-insurance-rates/

**Legacy integration + compliance**
- Superblocks, "Insurance Legacy System Transformation" https://www.superblocks.com/blog/insurance-legacy-system-transformation
- Decerto, "Insurance Software Integration: Connecting Legacy Systems" https://www.decerto.com/post/insurance-software-integration-connecting-legacy-systems
- Baker Tilly, "Regulatory Implications of AI/ML for Insurance" (NAIC model bulletin) https://www.bakertilly.com/insights/the-regulatory-implications-of-ai-and-ml-for-the-insurance-industry
- Kinro, "AI Audit Trails for Insurance Compliance" https://kinro.ai/blog/ai-audit-trails-insurance-compliance-quality-guide

**Standards to bookmark**
- ACORD (acord.org) - forms + ACORD data standards / XML. The interop standard your schema should map to/from.

---

## 6. Pitfalls, accuracy & compliance

- **LLM extraction is non-deterministic.** (Our fact-check killed the opposite claim.) Wrap every extraction in schema validation, type/range checks, and per-field **confidence scores**; retry on failure. Never assume exactness.
- **Confidence thresholds → human-in-the-loop.** Auto-process (STP) only above a confidence bar; route everything below it to an underwriter. Tune the threshold per field and per line (surety financials warrant a higher bar than a name field).
- **Validation/completeness gating.** Flag missing/inconsistent data before routing (step 4 of the pipeline). A submission missing loss runs or a WIP schedule should be auto-chased, not silently scored.
- **Data lineage & audit trails.** Regulators expect you to reconstruct any AI-influenced decision. Audit trails must "capture enough detail to fully reconstruct the AI's decision" so a human can verify it followed the rules [Kinro]. Log inputs, prompts, model version, extracted fields, confidence, and the human override if any. Cytora's **chain-of-thought** design exists specifically to make risk reasoning "auditable and explainable" [Cytora/Google Cloud], a pattern worth copying.
- **Regulatory frame: NAIC model bulletin.** "Use of Artificial Intelligence Systems by Insurers" (adopted Dec 2023); as of June 2025, **24 states have fully adopted it**, making it the de facto national standard [Baker Tilly]. It expects governance, testing, documentation, and bias controls around AI-driven underwriting. Bake this into the design from day one; for a publicly traded carrier it is table stakes.
- **Explainability for declines.** Auto-declination must be explainable and consistent (unfair-discrimination exposure). Keep the appetite rules transparent and versioned.

---

## 7. Suggested first build (a credible "we're not starting from zero" prototype)

1. Pick **one line** with a sharp schema. Surety is the differentiated pick; a WIP-schedule + financials extractor is high-signal and shows you understand their actual business.
2. **Pipeline**: monitored mailbox → attachment classifier (few-shot) → Textract/Claude-multimodal read → Claude structured extraction to a typed surety schema (principal, obligee, bond type/amount, per-project WIP rows, working capital) → validation + confidence → a simple appetite rule (e.g. bonding capacity check) → a ranked triage queue UI.
3. **Instrument it**: per-field confidence, full audit log, human-override capture. That demonstrates the compliance posture before they ask.
4. **Frame the moat as the data plane**: the schema + normalization + write-back adapters, reusable across lines, is the recurring integration work that compounds.

This maps one-to-one to how Cytora, Federato, and Convr describe their own systems, so it reads as credible to a sophisticated VP of AI transformation, while the surety/WIP focus signals you understand what a generic vendor cannot do for them.

---

*Research method note: 5 search angles → 25 sources fetched → 116 candidate claims → 25 load-bearing claims verified by 3 independent adversarial voters each (kill on 2/3 refute). 24 confirmed, 1 refuted (the "deterministic extraction" claim, corrected in §2/§6). Source quality is labeled inline; ⭐ marks primary/highest-value reading.*
