/** Animated integration map: sources → pipeline → data plane.
 *  Hand-drawn SVG (viewBox layout, responsive width). Connectors use the
 *  Stello-Demos flowDash animation; selection highlights a full path. */

import { useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { CATEGORY_LABELS, SOURCES, type SourceConfig, type Tier } from "./data";

const W = 860;
const H = 620;
const NODE_W = 218;
const NODE_H = 34;
const OUTPUT_NODE_H = 54;
const LEFT_X = 8;
const CENTER_X = 330;
const CENTER_W = 210;
const CENTER_H = 120;
const RIGHT_NODE_W = 190;
const SOR_1_X = 600;
const SOR_1_Y = 283;
const LANGFUSE_X = 600;
const LANGFUSE_Y = 400;
const SOR_2_X = 70;
const SOR_2_Y = 283;
const WORKFLOW_X = 340;
const WORKFLOW_Y = 255;
const WORKFLOW_W = 220;
const WORKFLOW_H = 110;
const OUTPUT_X = 630;
const REVIEW_Y = 116;
const DRAFT_Y = 450;

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

function pathFor(y: number, slot = 0, total = 1): string {
  const x0 = LEFT_X + NODE_W;
  const y0 = y + NODE_H / 2;
  const x1 = CENTER_X;
  // Stagger entry points down the hub's left face so the fan stays readable.
  const y1 = total > 1 ? CENTER_Y + 18 + (slot * (CENTER_H - 36)) / (total - 1) : H / 2;
  const mx = (x0 + x1) / 2;
  return `M ${x0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
}

function edge(x0: number, y0: number, x1: number, y1: number): string {
  const mx = (x0 + x1) / 2;
  return `M ${x0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
}

const SCENES = [
  { caption: "View 1 of 2 · Intake and extraction" },
  { caption: "View 2 of 2 · After the system of record" },
];

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
  const [scene, setScene] = useState(0);
  const sceneStyle = (index: number): CSSProperties => ({
    opacity: scene === index ? 1 : 0,
    transform: `translateX(${scene === index ? 0 : index === 0 ? -16 : 16}px)`,
    transition: "opacity 400ms ease, transform 400ms ease",
    pointerEvents: scene === index ? "auto" : "none",
  });

  return (
    <div className="relative flex h-full items-center border border-pale bg-white p-3 shadow-[0_30px_70px_-45px_rgba(30,58,92,0.5)]">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Integration map: data sources flowing into the submission intelligence pipeline and out to the data plane">
        <g style={sceneStyle(0)}>
        {/* connectors: sources -> pipeline */}
        {ROWS.map(({ source, y }, rowIndex) => {
          const active = activeFor(source);
          const selected = selectedId === source.id;
          const dimmed = !active;
          const degraded = source.health === "degraded";
          return (
            <g key={`p-${source.id}`}>
              <path
                d={pathFor(y, rowIndex, ROWS.length)}
                fill="none"
                className={degraded ? "" : "flow-line"}
                stroke={degraded ? "#f5b544" : selected ? "#2251ff" : "#2251ff"}
                strokeWidth={selected ? 2.4 : 1.3}
                opacity={dimmed ? 0.1 : degraded ? 0.7 : selected ? 1 : 0.4}
              />
              {source.direction === "read-write" && (
                <path
                  d={pathFor(y, rowIndex, ROWS.length)}
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

        {/* intake flow */}
        <path
          d={edge(CENTER_X + CENTER_W, H / 2, SOR_1_X, H / 2)}
          fill="none"
          stroke="#2251ff"
          strokeWidth={1.8}
          opacity={selectedId ? 0.3 : 0.7}
        />
        <text
          x={(CENTER_X + CENTER_W + SOR_1_X) / 2}
          y={302}
          textAnchor="middle"
          className="fill-[#48566b]"
          style={{ font: "8px 'Fragment Mono', monospace", letterSpacing: "0.14em" }}
        >
          WRITES
        </text>
        {/* continuation stub: the flow continues in view 2 */}
        <path
          d={`M ${SOR_1_X + RIGHT_NODE_W} ${H / 2} L ${W - 2} ${H / 2}`}
          fill="none"
          className="flow-line"
          stroke="#2251ff"
          strokeWidth={1.4}
          opacity={0.35}
        />
        <path
          d={edge(CENTER_X + CENTER_W / 2, CENTER_Y + CENTER_H, LANGFUSE_X, LANGFUSE_Y + OUTPUT_NODE_H / 2)}
          fill="none"
          className="flow-line"
          stroke="#2251ff"
          strokeWidth={1.1}
          opacity={0.45}
        />
        <text
          x={(CENTER_X + CENTER_W / 2 + LANGFUSE_X) / 2}
          y={(CENTER_Y + CENTER_H + LANGFUSE_Y + OUTPUT_NODE_H / 2) / 2 + 14}
          textAnchor="middle"
          className="fill-[#48566b]"
          style={{ font: "8px 'Fragment Mono', monospace", letterSpacing: "0.14em" }}
        >
          TRACES
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

        {/* system of record node */}
        <g data-node-id="postgres">
          <rect x={SOR_1_X} y={SOR_1_Y} width={RIGHT_NODE_W} height={OUTPUT_NODE_H} fill="#ffffff" stroke="#cdd9f5" />
          <rect x={SOR_1_X} y={SOR_1_Y} width={RIGHT_NODE_W} height={3} fill="#2251ff" />
          <text
            x={SOR_1_X + 14}
            y={SOR_1_Y + 24}
            className="fill-[#051c2c]"
            style={{ font: "500 12px 'Schibsted Grotesk', sans-serif" }}
          >
            System of record · Postgres
          </text>
          <text
            x={SOR_1_X + 14}
            y={SOR_1_Y + 40}
            className="fill-[#48566b]"
            style={{ font: "8.5px 'Fragment Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            submissions + audit trail
          </text>
        </g>

        {/* telemetry side channel */}
        <g data-node-id="langfuse" opacity={0.75}>
          <rect x={LANGFUSE_X} y={LANGFUSE_Y} width={RIGHT_NODE_W} height={OUTPUT_NODE_H} fill="#ffffff" stroke="#cdd9f5" />
          <rect x={LANGFUSE_X} y={LANGFUSE_Y} width={RIGHT_NODE_W} height={3} fill="#2251ff" />
          <text
            x={LANGFUSE_X + 14}
            y={LANGFUSE_Y + 24}
            className="fill-[#051c2c]"
            style={{ font: "500 12px 'Schibsted Grotesk', sans-serif" }}
          >
            Langfuse · OTel traces
          </text>
          <text
            x={LANGFUSE_X + 14}
            y={LANGFUSE_Y + 40}
            className="fill-[#48566b]"
            style={{ font: "8.5px 'Fragment Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            observability side channel
          </text>
        </g>
        </g>

        <g style={sceneStyle(1)}>
        {/* continuation stub: the flow arrived from view 1 */}
        <path
          d={`M 2 ${H / 2} L ${SOR_2_X} ${H / 2}`}
          fill="none"
          className="flow-line"
          stroke="#2251ff"
          strokeWidth={1.4}
          opacity={0.35}
        />
        {/* event-driven flow */}
        <path
          d={edge(SOR_2_X + RIGHT_NODE_W, H / 2, WORKFLOW_X, H / 2)}
          fill="none"
          className="flow-line"
          stroke="#2251ff"
          strokeWidth={1.4}
          opacity={0.6}
          strokeDasharray="4 3"
        />
        <text
          x={(SOR_2_X + RIGHT_NODE_W + WORKFLOW_X) / 2}
          y={H / 2 - 8}
          textAnchor="middle"
          className="fill-[#48566b]"
          style={{ font: "8px 'Fragment Mono', monospace", letterSpacing: "0.14em" }}
        >
          TRIGGER
        </text>
        <path
          d={edge(WORKFLOW_X + WORKFLOW_W, H / 2, OUTPUT_X, REVIEW_Y + OUTPUT_NODE_H / 2)}
          fill="none"
          className="flow-line"
          stroke="#2251ff"
          strokeWidth={1.4}
          opacity={0.6}
        />
        <path
          d={edge(WORKFLOW_X + WORKFLOW_W, H / 2, OUTPUT_X, DRAFT_Y + OUTPUT_NODE_H / 2)}
          fill="none"
          className="flow-line"
          stroke="#2251ff"
          strokeWidth={1.4}
          opacity={0.3}
        />
        <text
          x={(WORKFLOW_X + WORKFLOW_W + OUTPUT_X) / 2}
          y={H / 2 - 4}
          textAnchor="middle"
          className="fill-[#48566b]"
          style={{ font: "8px 'Fragment Mono', monospace", letterSpacing: "0.14em" }}
        >
          ROUTES
        </text>

        {/* system of record node */}
        <g data-node-id="postgres">
          <rect x={SOR_2_X} y={SOR_2_Y} width={RIGHT_NODE_W} height={OUTPUT_NODE_H} fill="#ffffff" stroke="#cdd9f5" />
          <rect x={SOR_2_X} y={SOR_2_Y} width={RIGHT_NODE_W} height={3} fill="#2251ff" />
          <text
            x={SOR_2_X + 14}
            y={SOR_2_Y + 24}
            className="fill-[#051c2c]"
            style={{ font: "500 12px 'Schibsted Grotesk', sans-serif" }}
          >
            System of record · Postgres
          </text>
          <text
            x={SOR_2_X + 14}
            y={SOR_2_Y + 40}
            className="fill-[#48566b]"
            style={{ font: "8.5px 'Fragment Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            submissions + audit trail
          </text>
        </g>

        {/* downstream workflow hub */}
        <g data-node-id="downstream-workflows">
          <rect
            x={WORKFLOW_X}
            y={WORKFLOW_Y}
            width={WORKFLOW_W}
            height={WORKFLOW_H}
            fill="#1e3a5c"
            className="node-glow"
          />
          <rect x={WORKFLOW_X} y={WORKFLOW_Y} width={WORKFLOW_W * 0.33} height={4} fill="#a9c4e8" />
          <rect x={WORKFLOW_X + WORKFLOW_W * 0.33} y={WORKFLOW_Y} width={WORKFLOW_W * 0.25} height={4} fill="#2251ff" />
          <rect x={WORKFLOW_X + WORKFLOW_W * 0.58} y={WORKFLOW_Y} width={WORKFLOW_W * 0.42} height={4} fill="#041330" />
          <text
            x={WORKFLOW_X + WORKFLOW_W / 2}
            y={WORKFLOW_Y + 50}
            textAnchor="middle"
            className="fill-white"
            style={{ font: "600 14px 'Schibsted Grotesk', sans-serif" }}
          >
            Downstream workflows
          </text>
          <text
            x={WORKFLOW_X + WORKFLOW_W / 2}
            y={WORKFLOW_Y + 72}
            textAnchor="middle"
            className="fill-[#a9c4e8]"
            style={{ font: "8px 'Fragment Mono', monospace", letterSpacing: "0.14em" }}
          >
            TRIGGERED · ON NEW ROW
          </text>
        </g>

        {/* consumers */}
        <g data-node-id="human-review">
          <rect x={OUTPUT_X} y={REVIEW_Y} width={RIGHT_NODE_W} height={OUTPUT_NODE_H} fill="#ffffff" stroke="#cdd9f5" />
          <rect x={OUTPUT_X} y={REVIEW_Y} width={RIGHT_NODE_W} height={3} fill="#2251ff" />
          <text
            x={OUTPUT_X + 14}
            y={REVIEW_Y + 24}
            className="fill-[#051c2c]"
            style={{ font: "500 12px 'Schibsted Grotesk', sans-serif" }}
          >
            Human review queue
          </text>
          <text
            x={OUTPUT_X + 14}
            y={REVIEW_Y + 40}
            className="fill-[#48566b]"
            style={{ font: "8.5px 'Fragment Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            confidence-gated
          </text>
        </g>
        <g data-node-id="broker-follow-up-drafts" opacity={0.55}>
          <rect
            x={OUTPUT_X}
            y={DRAFT_Y}
            width={RIGHT_NODE_W}
            height={OUTPUT_NODE_H}
            fill="#ffffff"
            stroke="#cdd9f5"
            strokeDasharray="4 3"
          />
          <rect x={OUTPUT_X} y={DRAFT_Y} width={RIGHT_NODE_W} height={3} fill="#cdd9f5" />
          <text
            x={OUTPUT_X + 14}
            y={DRAFT_Y + 24}
            className="fill-[#051c2c]"
            style={{ font: "500 12px 'Schibsted Grotesk', sans-serif" }}
          >
            Broker follow-up drafts
          </text>
          <text
            x={OUTPUT_X + 14}
            y={DRAFT_Y + 40}
            className="fill-[#48566b]"
            style={{ font: "8.5px 'Fragment Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            roadmap
          </text>
        </g>
        </g>
      </svg>

      {/* scene navigation */}
      {scene === 0 ? (
        <button
          type="button"
          aria-label="Show what happens after the system of record"
          onClick={() => setScene(1)}
          className="absolute right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center border border-pale bg-white text-body shadow-[0_14px_30px_-20px_rgba(30,58,92,0.6)] transition-colors hover:border-cobalt hover:text-cobalt focus-visible:outline-2 focus-visible:outline-cobalt"
        >
          <ChevronRight size={17} aria-hidden />
        </button>
      ) : (
        <button
          type="button"
          aria-label="Back to intake and extraction"
          onClick={() => setScene(0)}
          className="absolute left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center border border-pale bg-white text-body shadow-[0_14px_30px_-20px_rgba(30,58,92,0.6)] transition-colors hover:border-cobalt hover:text-cobalt focus-visible:outline-2 focus-visible:outline-cobalt"
        >
          <ChevronLeft size={17} aria-hidden />
        </button>
      )}
      <div className="pointer-events-none absolute bottom-3 right-4 text-right font-fragment text-[9px] uppercase tracking-[0.16em] text-body/50">
        {SCENES[scene].caption}
      </div>
    </div>
  );
}
