import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "../../components/ui";
import { CATEGORY_LABELS, RECENT_ACTIVITY, SOURCES, TIERS, type Tier } from "./data";
import { IntegrationMap } from "./IntegrationMap";
import { SourceCard, relSync } from "./SourceCard";
import { SourceDetail } from "./SourceDetail";

type View = "overview" | "inventory" | "activity";

const VIEWS: { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "inventory", label: "Inventory" },
  { id: "activity", label: "Activity" },
];

export function SourcesPage() {
  const [view, setView] = useState<View>("overview");
  const [selectedId, setSelectedId] = useState<string | null>("email-inbox");
  const [tier, setTier] = useState<Tier | null>(null);
  const [extraMins, setExtraMins] = useState(0);

  // tick "last sync" ages every 30s so the view feels alive
  useEffect(() => {
    const t = setInterval(() => setExtraMins((m) => m + 0.5), 30_000);
    return () => clearInterval(t);
  }, []);

  const selected = useMemo(() => SOURCES.find((s) => s.id === selectedId) ?? null, [selectedId]);
  const dimmedFor = (id: string) => {
    if (!tier) return false;
    const s = SOURCES.find((x) => x.id === id)!;
    return !s.tiers.includes(tier);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Data plane"
        title="Every system this pipeline touches, and how fresh each feed is."
        sub="Confirmed RLI intake surfaces plus the industry-standard enrichment feeds a surety underwriting file draws on — with cadence, direction, and PII classification per connection."
      />

      {/* secondary nav */}
      <div
        className="rise mb-6 flex items-center gap-1 border-b border-line"
        style={{ animationDelay: "280ms" }}
        role="tablist"
        aria-label="Sources views"
      >
        {VIEWS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={view === v.id}
            onClick={() => setView(v.id)}
            className={`px-4 py-2.5 font-schibsted text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-cobalt ${
              view === v.id
                ? "-mb-px border-b-2 border-cobalt font-medium text-cobalt"
                : "text-body hover:text-ink"
            }`}
          >
            {v.label}
          </button>
        ))}
        <span className="ml-auto hidden pb-1 font-fragment text-[9px] uppercase tracking-[0.14em] text-body/50 sm:block">
          {SOURCES.length} sources · design-partner view
        </span>
      </div>

      {view === "overview" && (
        <div className="fade-in">
          {/* tier filter */}
          <div className="mb-4 flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by underwriting program">
            <span className="mr-1 font-fragment text-[9px] uppercase tracking-[0.2em] text-body/60">
              RLI program
            </span>
            {[null, ...TIERS].map((t) => (
              <button
                key={t ?? "all"}
                onClick={() => setTier(t as Tier | null)}
                aria-pressed={tier === t}
                className={`px-3 py-1.5 font-fragment text-[10px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-2 focus-visible:outline-cobalt ${
                  tier === t
                    ? "bg-cobalt text-white"
                    : "bg-white text-body ring-1 ring-line hover:text-ink"
                }`}
              >
                {t ?? "All"}
              </button>
            ))}
          </div>

          <IntegrationMap selectedId={selectedId} onSelect={setSelectedId} tier={tier} />

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            {/* design-partner note */}
            <div className="self-start shadow-[0_14px_34px_-26px_rgba(30,58,92,0.5)]">
              <div className="flex h-1.5" aria-hidden>
                <div className="w-1/3 bg-slate" />
                <div className="w-1/4 bg-cobalt" />
                <div className="w-1/6 bg-[#4a7fe0]" />
                <div className="flex-1 bg-navy-deep" />
              </div>
              <p className="border border-t-0 border-pale bg-white px-4 py-3 text-[12.5px] leading-relaxed text-body">
                <span className="font-schibsted font-medium text-ink">Design-partner view. </span>
                Source configs are illustrative — confirmed RLI surfaces and industry-standard enrichment
                feeds, researched and cited in{" "}
                <span className="font-fragment text-[11px]">docs/RLI-data-sources-research.md</span>. Click a
                node to inspect it; connectors are scoped and built per engagement.
              </p>
            </div>
            {selected && <SourceDetail source={selected} extraMins={extraMins} />}
          </div>
        </div>
      )}

      {view === "inventory" && (
        <div className="fade-in grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            {(["submission", "carrier", "enrichment"] as const).map((cat) => (
              <section key={cat} className="mb-6">
                <div className="eyebrow mb-2">{CATEGORY_LABELS[cat]}</div>
                <div className="grid grid-cols-1 gap-px border border-pale bg-pale sm:grid-cols-2">
                  {SOURCES.filter((s) => s.category === cat).map((s) => (
                    <SourceCard
                      key={s.id}
                      source={s}
                      selected={selectedId === s.id}
                      dimmed={dimmedFor(s.id)}
                      extraMins={extraMins}
                      onSelect={() => setSelectedId(s.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
          <div className="lg:sticky lg:top-4 lg:self-start">
            {selected && <SourceDetail source={selected} extraMins={extraMins} />}
          </div>
        </div>
      )}

      {view === "activity" && (
        <div className="fade-in mx-auto max-w-3xl">
          <ul className="border border-pale bg-white shadow-[0_14px_34px_-28px_rgba(5,28,44,0.5)]">
            {RECENT_ACTIVITY.map((a, i) => (
              <li
                key={`${a.source}-${i}`}
                className="fade-in flex gap-3 border-b border-line/70 px-4 py-3 last:border-0"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <span className="w-16 shrink-0 pt-0.5 font-fragment text-[9.5px] text-body/50">
                  {relSync(a.minsAgo + extraMins)}
                </span>
                <span className="text-[13px] leading-snug text-body">
                  <span className="font-schibsted font-medium text-ink">{a.source}</span> · {a.event}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-center font-fragment text-[9.5px] uppercase tracking-[0.14em] text-body/50">
            Illustrative feed — production version reads the audit trail
          </p>
        </div>
      )}
    </div>
  );
}
