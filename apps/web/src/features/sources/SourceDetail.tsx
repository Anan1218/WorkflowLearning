import { ArrowDownToLine, ArrowLeftRight } from "lucide-react";

import { Badge, Card } from "../../components/ui";
import { GlossaryText, Term } from "../../components/Term";
import type { SourceConfig } from "./data";
import { relSync } from "./SourceCard";

const PII_LABEL: Record<SourceConfig["piiClass"], { label: string; tone: "neutral" | "cobalt" | "flag" }> = {
  none: { label: "no PII", tone: "neutral" },
  business: { label: "business data", tone: "cobalt" },
  high: { label: "PII: high (NPI)", tone: "flag" },
};

export function SourceDetail({ source, extraMins }: { source: SourceConfig; extraMins: number }) {
  const pii = PII_LABEL[source.piiClass];
  return (
    <Card tier="stage" className="pop-in min-h-full !p-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="font-newsreader text-[1.2rem] leading-tight text-ink">{source.name}</h3>
        {source.direction === "read-write" ? (
          <ArrowLeftRight size={14} className="shrink-0 text-cobalt" aria-label="read-write" />
        ) : (
          <ArrowDownToLine size={14} className="shrink-0 text-body/60" aria-label="read-only" />
        )}
      </div>
      <p className="mb-3 text-[13px] leading-[1.6] text-body">
        <GlossaryText text={source.systemNote} />.
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge tone={pii.tone}>{pii.label}</Badge>
        <Badge tone="neutral">{source.direction}</Badge>
        <Badge tone={source.provenance === "confirmed" ? "cobalt" : "neutral"}>
          {source.provenance === "confirmed"
            ? "confirmed RLI surface"
            : source.provenance === "inferred"
              ? "inferred"
              : "industry standard"}
        </Badge>
      </div>

      <dl className="mb-3 border border-line text-[12px]">
        <div className="flex justify-between border-b border-line bg-wash px-3 py-1.5">
          <dt className="font-fragment text-[9px] uppercase tracking-[0.12em] text-body/60">Cadence</dt>
          <dd className="font-fragment text-[10.5px] text-ink">{source.cadence}</dd>
        </div>
        <div className="flex justify-between border-b border-line px-3 py-1.5">
          <dt className="font-fragment text-[9px] uppercase tracking-[0.12em] text-body/60">Last sync</dt>
          <dd className="font-fragment text-[10.5px] text-ink">{relSync(source.lastSyncMinsAgo + extraMins)}</dd>
        </div>
        <div className="flex justify-between px-3 py-1.5">
          <dt className="font-fragment text-[9px] uppercase tracking-[0.12em] text-body/60">Volume</dt>
          <dd className="font-fragment text-[10.5px] text-ink">{source.volumePerDay}</dd>
        </div>
      </dl>

      <p className="mb-3 text-[12px] leading-[1.6] text-body">
        <span className="font-schibsted font-medium text-ink">Why this cadence: </span>
        <GlossaryText text={source.cadenceRationale} />
      </p>

      <div className="eyebrow mb-1.5 !text-[9px]">Feeds</div>
      <ul className="mb-3 flex flex-wrap gap-1.5">
        {source.feeds.map((f) => (
          <li key={f} className="border border-line bg-wash px-2 py-0.5 font-fragment text-[10px] text-body">
            <GlossaryText text={f} />
          </li>
        ))}
      </ul>

      <div className="eyebrow mb-1.5 !text-[9px]">Active in programs</div>
      <p className="mb-3 font-fragment text-[10.5px] text-body">
        {source.tiers.map((tier, i) => (
          <span key={tier}>
            {i > 0 && " · "}
            <Term k={tier.toLowerCase()}>{tier}</Term>
          </span>
        ))}
      </p>

      {source.compliance && (
        <p className="border border-line bg-mist px-3 py-2 text-[12px] leading-[1.6] text-body">
          <span className="font-schibsted font-medium text-ink">Compliance: </span>
          <GlossaryText text={source.compliance} />
        </p>
      )}
      {source.category === "enrichment" && !source.compliance && (
        <p className="border border-line bg-mist px-3 py-2 text-[12px] leading-[1.6] text-body">
          <span className="font-schibsted font-medium text-ink">Compliance: </span>
          <GlossaryText text="External subprocessor, listed on the vendor register with DPA + SOC 2 evidence." />
        </p>
      )}
    </Card>
  );
}
