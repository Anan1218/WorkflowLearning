import { useEffect, useMemo, useState } from "react";

import { Chip } from "../../components/ui";
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
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* compact header row: title + sub-nav */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-3">
        <div className="flex items-center gap-3">
          <Chip>Data plane</Chip>
          <h1 className="font-newsreader text-[1.5rem] font-normal leading-none tracking-[-0.01em] text-ink">
            Sources
          </h1>
        </div>
        <div className="flex items-center gap-1" role="tablist" aria-label="Sources views">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
              className={`px-3.5 py-1.5 font-schibsted text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-cobalt ${
                view === v.id
                  ? "bg-white font-medium text-cobalt shadow-[0_14px_30px_-22px_rgba(30,58,92,0.5)] ring-1 ring-pale"
                  : "text-body hover:text-ink"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <span className="ml-auto hidden font-fragment text-[9px] uppercase tracking-[0.14em] text-body/50 lg:block">
          {SOURCES.length} sources · every connection: cadence · direction · PII class
        </span>
      </div>

      {view === "overview" && (
        <div className="fade-in flex min-h-0 flex-1 flex-col">
          {/* tier filter + slim note */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
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
            <span className="ml-auto hidden font-fragment text-[9px] uppercase tracking-[0.1em] text-body/50 md:block">
              design-partner view · cited in docs/RLI-data-sources-research.md
            </span>
          </div>

          {/* map + detail, fills remaining height exactly - detail scrolls internally */}
          <div className="flex min-h-0 flex-1 flex-col gap-5 pb-1 lg:flex-row lg:overflow-hidden">
            <div className="min-h-[420px] lg:min-h-0 lg:min-w-0 lg:flex-1">
              <IntegrationMap selectedId={selectedId} onSelect={setSelectedId} tier={tier} />
            </div>
            <aside className="thin-scroll min-h-0 lg:w-[340px] lg:shrink-0 lg:overflow-y-auto">
              {selected && <SourceDetail source={selected} extraMins={extraMins} />}
            </aside>
          </div>
        </div>
      )}

      {view === "inventory" && (
        <div className="fade-in thin-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
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
            <div className="lg:sticky lg:top-0 lg:self-start">
              {selected && <SourceDetail source={selected} extraMins={extraMins} />}
            </div>
          </div>
        </div>
      )}

      {view === "activity" && (
        <div className="fade-in thin-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl">
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
        </div>
      )}
    </div>
  );
}
