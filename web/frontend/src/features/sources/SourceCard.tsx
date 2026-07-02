import { Building2, Database, FileText, Globe, Inbox, Landmark, Mail, Scale, ShieldCheck, User } from "lucide-react";

import type { SourceConfig } from "./data";

const ICONS: Record<string, typeof Mail> = {
  "email-inbox": Mail,
  "contract-bond-app": FileText,
  rlink: Globe,
  "broker-sftp": Inbox,
  "bond-sor": Database,
  "ams-feeds": Building2,
  dms: FileText,
  dnb: Landmark,
  "personal-credit": User,
  lexis: Scale,
  "sos-ucc": Landmark,
  pacer: Scale,
  sba: ShieldCheck,
  "sam-gov": Globe,
};

const HEALTH_STYLE: Record<SourceConfig["health"], { dot: string; label: string; text: string }> = {
  live: { dot: "bg-ok", label: "live", text: "text-ok" },
  scheduled: { dot: "bg-slate", label: "scheduled", text: "text-body" },
  degraded: { dot: "bg-warn", label: "degraded", text: "text-[#8a6415]" },
};

export function relSync(minsAgo: number): string {
  if (minsAgo < 60) return `${minsAgo}m ago`;
  if (minsAgo < 48 * 60) return `${Math.round(minsAgo / 60)}h ago`;
  return `${Math.round(minsAgo / (24 * 60))}d ago`;
}

export function SourceCard({
  source,
  selected,
  dimmed,
  extraMins,
  onSelect,
}: {
  source: SourceConfig;
  selected: boolean;
  dimmed: boolean;
  extraMins: number;
  onSelect: () => void;
}) {
  const Icon = ICONS[source.id] ?? Database;
  const health = HEALTH_STYLE[source.health];

  return (
    <button
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative h-full w-full border-t-4 p-4 text-left transition-all focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cobalt ${
        selected
          ? "border-t-cobalt bg-wash"
          : "border-t-transparent bg-white hover:border-t-cobalt hover:bg-wash"
      } ${dimmed ? "opacity-35" : ""}`}
    >
      {selected && <span className="absolute inset-y-0 left-0 w-[3px] bg-cobalt" aria-hidden />}
      <div className="mb-1.5 flex items-center gap-2">
        <Icon size={14} className="shrink-0 text-cobalt" aria-hidden />
        <span className="truncate font-schibsted text-[13.5px] font-medium text-ink">{source.name}</span>
      </div>
      <div className="mb-2.5 flex items-center gap-2">
        <span className={`flex items-center gap-1.5 font-fragment text-[9px] uppercase tracking-[0.12em] ${health.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${health.dot} ${source.health === "live" ? "pulse-dot" : ""}`} />
          {health.label}
        </span>
        <span className="font-fragment text-[9px] uppercase tracking-[0.12em] text-body/60">
          {source.connection}
        </span>
        <span
          className={`ml-auto font-fragment text-[8.5px] uppercase tracking-[0.1em] ${
            source.provenance === "confirmed" ? "text-cobalt" : "text-body/50"
          }`}
        >
          {source.provenance === "confirmed" ? "confirmed" : source.provenance === "inferred" ? "inferred" : "std practice"}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="font-fragment text-[10px] leading-relaxed text-body">
          {source.cadence}
          <br />
          <span className="text-body/60">sync {relSync(source.lastSyncMinsAgo + extraMins)}</span>
        </div>
        <div className="text-right font-fragment text-[11px] text-cobalt">{source.volumePerDay}</div>
      </div>
    </button>
  );
}
