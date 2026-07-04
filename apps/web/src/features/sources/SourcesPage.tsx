import { useEffect, useMemo, useState } from "react";

import { Chip } from "../../components/ui";
import { Term } from "../../components/Term";
import { SOURCES, TIERS, type Tier } from "./data";
import { IntegrationMap } from "./IntegrationMap";
import { SourceDetail } from "./SourceDetail";

export function SourcesPage() {
  const [selectedId, setSelectedId] = useState<string | null>("email-inbox");
  const [tier, setTier] = useState<Tier | null>(null);
  const [extraMins, setExtraMins] = useState(0);

  // tick "last sync" ages every 30s so the view feels alive
  useEffect(() => {
    const t = setInterval(() => setExtraMins((m) => m + 0.5), 30_000);
    return () => clearInterval(t);
  }, []);

  const selected = useMemo(() => SOURCES.find((s) => s.id === selectedId) ?? null, [selectedId]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* compact header row */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-3">
        <div className="flex items-center gap-3">
          <Chip>Unified Data Layer</Chip>
          <h1 className="font-newsreader text-[1.5rem] font-normal leading-none tracking-[-0.01em] text-ink">
            Sources
          </h1>
        </div>
        <span className="ml-auto hidden font-fragment text-[9px] uppercase tracking-[0.14em] text-body/50 lg:block">
          {SOURCES.length} sources · every connection: cadence · direction · PII class
        </span>
      </div>

      {/* RLI program filter */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-fragment text-[9px] uppercase tracking-[0.2em] text-body/60">
          RLI program
        </span>
        {[null, ...TIERS].map((t) => (
          <button
            key={t ?? "all"}
            onClick={() => {
              const next = t as Tier | null;
              setTier(next);
              // keep the detail panel relevant: jump to a source in this program
              if (next) {
                const current = SOURCES.find((s) => s.id === selectedId);
                if (!current || !current.tiers.includes(next)) {
                  const first = SOURCES.find((s) => s.tiers.includes(next));
                  if (first) setSelectedId(first.id);
                }
              }
            }}
            aria-pressed={tier === t}
            className={`px-3 py-1.5 font-fragment text-[10px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-2 focus-visible:outline-cobalt ${
              tier === t
                ? "bg-cobalt text-white"
                : "bg-white text-body ring-1 ring-line hover:text-ink"
            }`}
          >
            {t ? (
              <Term k={t.toLowerCase()} focusable={false}>
                {t}
              </Term>
            ) : (
              "All"
            )}
          </button>
        ))}
      </div>

      {/* map + detail, fills remaining height exactly - detail scrolls internally */}
      <div className="fade-in flex min-h-0 flex-1 flex-col gap-5 pb-1 lg:flex-row lg:overflow-hidden">
        <div className="min-h-[420px] lg:min-h-0 lg:min-w-0 lg:flex-1">
          <IntegrationMap selectedId={selectedId} onSelect={setSelectedId} tier={tier} />
        </div>
        <aside className="thin-scroll min-h-0 lg:w-[340px] lg:shrink-0 lg:overflow-y-auto">
          {selected && <SourceDetail source={selected} extraMins={extraMins} />}
        </aside>
      </div>
    </div>
  );
}
