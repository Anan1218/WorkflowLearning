/** Animated integration map: sources → pipeline → data plane.
 *  Hand-drawn SVG (viewBox layout, responsive width). Connectors use the
 *  Stello-Demos flowDash animation; selection highlights a full path. */

import { CATEGORY_LABELS, SOURCES, type SourceConfig, type Tier } from "./data";

const W = 1000;
const H = 620;
const NODE_W = 218;
const NODE_H = 34;
const LEFT_X = 8;
const CENTER_X = 400;
const CENTER_W = 210;
const CENTER_H = 120;
const RIGHT_X = W - 226;

// The data flow is a chain: every pipeline write lands in the system of record,
// and the review queue consumes from Postgres. Traces are telemetry, not data flow.
const OUTPUTS = [
  { id: "langfuse", label: "Langfuse · OTel traces", note: "observability side channel", y: 80, kind: "telemetry" as const },
  { id: "postgres", label: "System of record · Postgres", note: "submissions + audit trail", y: 240, kind: "primary" as const },
  { id: "review", label: "Human review queue", note: "confidence-gated · reads postgres", y: 420, kind: "downstream" as const },
];

type Layout = { source: SourceConfig; y: number };

function layoutSources(): { rows: Layout[]; headers: { label: string; y: number }[] } {
  const rows: Layout[] = [];
  const headers: { label: string; y: number }[] = [];
  let y = 26;
  for (const cat of ["submission", "carrier", "enrichment"] as const) {
    headers.push({ label: CATEGORY_LABELS[cat], y });
    y += 16;
    for (const source of SOURCES.filter((s) => s.category === cat)) {
      rows.push({ source, y });
      y += NODE_H + 6;
    }
    y += 12;
  }
  return { rows, headers };
}

const { rows: ROWS, headers: HEADERS } = layoutSources();
const CENTER_Y = H / 2 - CENTER_H / 2;

function pathFor(y: number): string {
  const x0 = LEFT_X + NODE_W;
  const y0 = y + NODE_H / 2;
  const x1 = CENTER_X;
  const y1 = H / 2;
  const mx = (x0 + x1) / 2;
  return `M ${x0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
}

function outPathFor(y: number): string {
  const x0 = CENTER_X + CENTER_W;
  const y0 = H / 2;
  const x1 = RIGHT_X;
  const y1 = y + 27;
  const mx = (x0 + x1) / 2;
  return `M ${x0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
}

export function IntegrationMap({
  selectedId,
  onSelect,
  tier,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  tier: Tier | null;
}) {
  const activeFor = (s: SourceConfig) => (tier ? s.tiers.includes(tier) : true);

  return (
    <div className="flex h-full items-center border border-pale bg-white p-3 shadow-[0_30px_70px_-45px_rgba(30,58,92,0.5)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Integration map: data sources flowing into the submission intelligence pipeline and out to the data plane">
        {/* connectors: sources -> pipeline */}
        {ROWS.map(({ source, y }) => {
          const active = activeFor(source);
          const selected = selectedId === source.id;
          const dimmed = !active;
          const degraded = source.health === "degraded";
          return (
            <g key={`p-${source.id}`}>
              <path
                d={pathFor(y)}
                fill="none"
                className={degraded ? "" : "flow-line"}
                stroke={degraded ? "#f5b544" : selected ? "#2251ff" : "#2251ff"}
                strokeWidth={selected ? 2.4 : 1.3}
                opacity={dimmed ? 0.1 : degraded ? 0.7 : selected ? 1 : 0.4}
              />
              {source.direction === "read-write" && (
                <path
                  d={pathFor(y)}
                  fill="none"
                  className="flow-line-slow"
                  stroke="#a9c4e8"
                  strokeWidth={1}
                  opacity={dimmed ? 0.08 : 0.5}
                />
              )}
            </g>
          );
        })}

        {/* connectors: pipeline -> system of record (writes), pipeline -> traces (telemetry) */}
        {OUTPUTS.filter((o) => o.kind !== "downstream").map((o) => (
          <g key={`op-${o.id}`}>
            <path
              d={outPathFor(o.y)}
              fill="none"
              className="flow-line"
              stroke="#2251ff"
              strokeWidth={o.kind === "telemetry" ? 1 : 1.8}
              opacity={(selectedId ? 0.25 : 0.55) * (o.kind === "telemetry" ? 0.55 : 1)}
            />
          </g>
        ))}
        <text
          x={(CENTER_X + CENTER_W + RIGHT_X) / 2 - 14}
          y={H / 2 + (240 + 27 - H / 2) / 2 + 2}
          className="fill-[#48566b]"
          style={{ font: "8px 'Fragment Mono', monospace", letterSpacing: "0.14em" }}
        >
          WRITES
        </text>

        {/* connector: system of record -> human review queue (reads) */}
        <path
          d={`M ${RIGHT_X + NODE_W / 2} ${240 + 54} C ${RIGHT_X + NODE_W / 2} ${240 + 54 + 45}, ${RIGHT_X + NODE_W / 2} ${420 - 45}, ${RIGHT_X + NODE_W / 2} ${420}`}
          fill="none"
          className="flow-line"
          stroke="#2251ff"
          strokeWidth={1.6}
          opacity={selectedId ? 0.25 : 0.55}
        />
        <text
          x={RIGHT_X + NODE_W / 2 + 8}
          y={(240 + 54 + 420) / 2 + 3}
          className="fill-[#48566b]"
          style={{ font: "8px 'Fragment Mono', monospace", letterSpacing: "0.14em" }}
        >
          READS
        </text>

        {/* category headers */}
        {HEADERS.map((h) => (
          <text
            key={h.label}
            x={LEFT_X}
            y={h.y + 4}
            className="fill-[#48566b]"
            style={{ font: "9px 'Fragment Mono', monospace", letterSpacing: "0.14em", textTransform: "uppercase" }}
          >
            {h.label}
          </text>
        ))}

        {/* source nodes */}
        {ROWS.map(({ source, y }) => {
          const active = activeFor(source);
          const selected = selectedId === source.id;
          const dimmed = !active;
          return (
            <g
              key={source.id}
              onClick={() => onSelect(source.id)}
              className="cursor-pointer"
              opacity={dimmed ? 0.25 : 1}
              role="button"
              aria-label={`${source.name}: select`}
            >
              <rect
                x={LEFT_X}
                y={y}
                width={NODE_W}
                height={NODE_H}
                fill={selected ? "#f8fbff" : "#ffffff"}
                stroke={selected ? "#2251ff" : "#cdd9f5"}
                strokeWidth={selected ? 1.6 : 1}
              />
              {selected && <rect x={LEFT_X} y={y} width={3} height={NODE_H} fill="#2251ff" />}
              <circle
                cx={LEFT_X + 14}
                cy={y + NODE_H / 2}
                r={3.5}
                fill={source.health === "live" ? "#1c7d4d" : source.health === "degraded" ? "#f5b544" : "#a9c4e8"}
                className={source.health === "live" ? "pulse-dot" : ""}
              />
              <text
                x={LEFT_X + 26}
                y={y + 15}
                className="fill-[#051c2c]"
                style={{ font: "500 11px 'Schibsted Grotesk', sans-serif" }}
              >
                {source.name.length > 30 ? source.name.slice(0, 29) + "…" : source.name}
              </text>
              <text
                x={LEFT_X + 26}
                y={y + 27}
                className="fill-[#48566b]"
                style={{ font: "8px 'Fragment Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}
              >
                {(() => {
                  const meta = `${source.connection} · ${source.cadence}`;
                  return meta.length > 33 ? meta.slice(0, 32) + "…" : meta;
                })()}
              </text>
            </g>
          );
        })}

        {/* center pipeline node */}
        <g>
          <rect
            x={CENTER_X}
            y={CENTER_Y}
            width={CENTER_W}
            height={CENTER_H}
            fill="#1e3a5c"
            className="node-glow"
          />
          <rect x={CENTER_X} y={CENTER_Y} width={CENTER_W * 0.33} height={5} fill="#a9c4e8" />
          <rect x={CENTER_X + CENTER_W * 0.33} y={CENTER_Y} width={CENTER_W * 0.25} height={5} fill="#2251ff" />
          <rect x={CENTER_X + CENTER_W * 0.58} y={CENTER_Y} width={CENTER_W * 0.42} height={5} fill="#041330" />
          <text
            x={CENTER_X + CENTER_W / 2}
            y={CENTER_Y + 46}
            textAnchor="middle"
            className="fill-white"
            style={{ font: "500 15px 'Newsreader', serif" }}
          >
            Submission Intelligence
          </text>
          <text
            x={CENTER_X + CENTER_W / 2}
            y={CENTER_Y + 66}
            textAnchor="middle"
            className="fill-[#a9c4e8]"
            style={{ font: "8.5px 'Fragment Mono', monospace", letterSpacing: "0.12em" }}
          >
            CLASSIFY · EXTRACT · VALIDATE
          </text>
          <text
            x={CENTER_X + CENTER_W / 2}
            y={CENTER_Y + 80}
            textAnchor="middle"
            className="fill-[#a9c4e8]"
            style={{ font: "8.5px 'Fragment Mono', monospace", letterSpacing: "0.12em" }}
          >
            CONFIDENCE GATE · ROUTE
          </text>
        </g>

        {/* output nodes */}
        {OUTPUTS.map((o) => (
          <g key={o.id}>
            <rect x={RIGHT_X} y={o.y} width={NODE_W} height={54} fill="#ffffff" stroke="#cdd9f5" />
            <rect x={RIGHT_X} y={o.y} width={NODE_W} height={3} fill="#2251ff" />
            <text
              x={RIGHT_X + 14}
              y={o.y + 24}
              className="fill-[#051c2c]"
              style={{ font: "500 12px 'Schibsted Grotesk', sans-serif" }}
            >
              {o.label}
            </text>
            <text
              x={RIGHT_X + 14}
              y={o.y + 40}
              className="fill-[#48566b]"
              style={{ font: "8.5px 'Fragment Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              {o.note}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
