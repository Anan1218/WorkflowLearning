/** Animated integration map: sources -> pipeline -> data plane.
 *  Hand-drawn SVG (viewBox layout, responsive width). Connectors use the
 *  Stello-Demos flowDash animation; selection highlights a full path. */

import { useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { SOURCES, type SourceConfig, type Tier } from "./data";

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
const LANGFUSE_Y = 96;
const SOR_2_X = 70;
const SOR_2_Y = 283;
const WORKFLOW_X = 340;
const WORKFLOW_Y = 255;
const WORKFLOW_W = 220;
const WORKFLOW_H = 110;
const OUTPUT_X = 630;
const REVIEW_Y = 116;
const DMS_Y = 283;
const DRAFT_Y = 450;
const CENTER_Y = H / 2 - CENTER_H / 2;

type SceneIndex = 0 | 1;
type SourceGroup = { header: string; ids: string[] };
type Layout = { source: SourceConfig; y: number };
type HeaderLayout = { label: string; y: number };
type ColumnLayout = { rows: Layout[]; headers: HeaderLayout[] };

const MONO_LABEL_STYLE: CSSProperties = {
  font: "8px 'Fragment Mono', monospace",
  letterSpacing: "0.14em",
};

const SOURCE_HEADER_STYLE: CSSProperties = {
  font: "9px 'Fragment Mono', monospace",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

const SOURCE_META_STYLE: CSSProperties = {
  font: "8px 'Fragment Mono', monospace",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const OUTPUT_META_STYLE: CSSProperties = {
  font: "8.5px 'Fragment Mono', monospace",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

function sourceById(id: string): SourceConfig {
  const source = SOURCES.find((s) => s.id === id);
  if (!source) {
    throw new Error(`Missing source config: ${id}`);
  }
  return source;
}

function buildColumn(groups: SourceGroup[], startY = 26): ColumnLayout {
  const rows: Layout[] = [];
  const headers: HeaderLayout[] = [];
  let y = startY;

  for (const group of groups) {
    headers.push({ label: group.header, y });
    y += 16;
    for (const id of group.ids) {
      rows.push({ source: sourceById(id), y });
      y += NODE_H + 6;
    }
    y += 12;
  }

  return { rows, headers };
}

const PREPARE_INTAKE_COLUMN = buildColumn(
  [
    { header: "Submission channels", ids: ["email-inbox", "contract-bond-app", "rlink", "broker-sftp"] },
    { header: "Pulled per submission", ids: ["dnb", "personal-credit", "lexis", "sos-ucc", "sba"] },
    { header: "Scheduled feeds", ids: ["bond-sor", "ams-feeds", "pacer", "sam-gov"] },
  ],
  14,
);
const INTAKE_ROW_COUNT = 9;
const SYNC_ENDPOINTS = [620, 640, 660, 680] as const;

function pathFor(y: number, slot: number, total: number, targetX: number, targetY0: number, targetY1: number): string {
  const x0 = LEFT_X + NODE_W;
  const y0 = y + NODE_H / 2;
  const y1 = total > 1 ? targetY0 + (slot * (targetY1 - targetY0)) / (total - 1) : (targetY0 + targetY1) / 2;
  const mx = (x0 + targetX) / 2;
  return `M ${x0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${targetX} ${y1}`;
}

function edge(x0: number, y0: number, x1: number, y1: number): string {
  const mx = (x0 + x1) / 2;
  return `M ${x0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
}

const SCENES = [
  { caption: "View 1 of 2 · Feeds sync the layer; submissions write the record" },
  { caption: "View 2 of 2 · After the record: the new row triggers follow-through" },
] as const;

function MonoLabel({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: string;
}) {
  return (
    <text x={x} y={y} textAnchor="middle" className="fill-[#48566b]" style={MONO_LABEL_STYLE}>
      {children}
    </text>
  );
}

function SystemOfRecordNode({
  x,
  y,
  note,
}: {
  x: number;
  y: number;
  note: string;
}) {
  return (
    <g data-node-id="postgres">
      <rect x={x} y={y} width={RIGHT_NODE_W} height={OUTPUT_NODE_H} fill="#ffffff" stroke="#cdd9f5" />
      <rect x={x} y={y} width={RIGHT_NODE_W} height={3} fill="#2251ff" />
      <text x={x + 14} y={y + 24} className="fill-[#051c2c]" style={{ font: "500 12px 'Schibsted Grotesk', sans-serif" }}>
        System of record · Postgres
      </text>
      <text x={x + 14} y={y + 40} className="fill-[#48566b]" style={OUTPUT_META_STYLE}>
        {note}
      </text>
    </g>
  );
}

function LangfuseNode() {
  return (
    <g data-node-id="langfuse" opacity={0.55}>
      <rect
        x={LANGFUSE_X}
        y={LANGFUSE_Y}
        width={RIGHT_NODE_W}
        height={OUTPUT_NODE_H}
        fill="#ffffff"
        stroke="#cdd9f5"
        strokeDasharray="4 3"
      />
      <rect x={LANGFUSE_X} y={LANGFUSE_Y} width={RIGHT_NODE_W} height={3} fill="#cdd9f5" />
      <text
        x={LANGFUSE_X + 14}
        y={LANGFUSE_Y + 24}
        className="fill-[#051c2c]"
        style={{ font: "500 12px 'Schibsted Grotesk', sans-serif" }}
      >
        Langfuse · OTel traces
      </text>
      <text x={LANGFUSE_X + 14} y={LANGFUSE_Y + 40} className="fill-[#48566b]" style={OUTPUT_META_STYLE}>
        observability side channel
      </text>
    </g>
  );
}

function SubmissionHub() {
  return (
    <g>
      <rect x={CENTER_X} y={CENTER_Y} width={CENTER_W} height={CENTER_H} fill="#1e3a5c" className="node-glow" />
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
  );
}

function WorkflowHub() {
  return (
    <g data-node-id="downstream-workflows">
      <rect x={WORKFLOW_X} y={WORKFLOW_Y} width={WORKFLOW_W} height={WORKFLOW_H} fill="#1e3a5c" className="node-glow" />
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
        style={MONO_LABEL_STYLE}
      >
        TRIGGERED · ON NEW ROW
      </text>
    </g>
  );
}

function ConsumerNode({
  id,
  y,
  label,
  note,
  ghost = false,
}: {
  id: string;
  y: number;
  label: string;
  note: string;
  ghost?: boolean;
}) {
  return (
    <g data-node-id={id} opacity={ghost ? 0.55 : 1}>
      <rect
        x={OUTPUT_X}
        y={y}
        width={RIGHT_NODE_W}
        height={OUTPUT_NODE_H}
        fill="#ffffff"
        stroke="#cdd9f5"
        strokeDasharray={ghost ? "4 3" : undefined}
      />
      <rect x={OUTPUT_X} y={y} width={RIGHT_NODE_W} height={3} fill={ghost ? "#cdd9f5" : "#2251ff"} />
      <text x={OUTPUT_X + 14} y={y + 24} className="fill-[#051c2c]" style={{ font: "500 12px 'Schibsted Grotesk', sans-serif" }}>
        {label}
      </text>
      <text x={OUTPUT_X + 14} y={y + 40} className="fill-[#48566b]" style={OUTPUT_META_STYLE}>
        {note}
      </text>
    </g>
  );
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
  const [scene, setScene] = useState<SceneIndex>(0);
  const sceneStyle = (index: SceneIndex): CSSProperties => ({
    opacity: scene === index ? 1 : 0,
    transform: `translateX(${scene === index ? 0 : index > scene ? 16 : -16}px)`,
    transition: "opacity 400ms ease, transform 400ms ease",
    pointerEvents: scene === index ? "auto" : "none",
  });
  const intakeRows = PREPARE_INTAKE_COLUMN.rows.slice(0, INTAKE_ROW_COUNT);
  const syncRows = PREPARE_INTAKE_COLUMN.rows.slice(INTAKE_ROW_COUNT);

  const renderSourceConnectors = (
    rows: Layout[],
    targetX: number,
    targetY0: number,
    targetY1: number,
    options: { dashed?: boolean; strokeWidth: number; selectedStrokeWidth?: number; showReadWriteOverlay?: boolean },
  ) =>
    rows.map(({ source, y }, rowIndex) => {
      const active = activeFor(source);
      const selected = selectedId === source.id;
      const dimmed = !active;
      const degraded = source.health === "degraded";
      const d = pathFor(y, rowIndex, rows.length, targetX, targetY0, targetY1);

      return (
        <g key={`p-${source.id}`}>
          <path
            d={d}
            fill="none"
            className={options.dashed || !degraded ? "flow-line" : ""}
            stroke={degraded ? "#f5b544" : "#2251ff"}
            strokeWidth={selected && options.selectedStrokeWidth ? options.selectedStrokeWidth : options.strokeWidth}
            strokeDasharray={options.dashed ? "4 3" : undefined}
            opacity={dimmed ? 0.1 : degraded ? 0.7 : selected ? 1 : 0.4}
          />
          {options.showReadWriteOverlay && source.direction === "read-write" && (
            <path
              d={d}
              fill="none"
              className="flow-line-slow"
              stroke="#a9c4e8"
              strokeWidth={1}
              opacity={dimmed ? 0.08 : 0.5}
            />
          )}
        </g>
      );
    });

  const renderSourceColumn = (rows: Layout[], headers: HeaderLayout[]) => (
    <>
      {headers.map((h) => (
        <text key={h.label} x={LEFT_X} y={h.y + 4} className="fill-[#48566b]" style={SOURCE_HEADER_STYLE}>
          {h.label}
        </text>
      ))}

      {rows.map(({ source, y }) => {
        const active = activeFor(source);
        const selected = selectedId === source.id;
        const dimmed = !active;
        const name = source.name.length > 30 ? `${source.name.slice(0, 29)}...` : source.name;
        const meta = `${source.connection} · ${source.cadence}`;
        const renderedMeta = meta.length > 33 ? `${meta.slice(0, 32)}...` : meta;

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
            <text x={LEFT_X + 26} y={y + 15} className="fill-[#051c2c]" style={{ font: "500 11px 'Schibsted Grotesk', sans-serif" }}>
              {name}
            </text>
            <text x={LEFT_X + 26} y={y + 27} className="fill-[#48566b]" style={SOURCE_META_STYLE}>
              {renderedMeta}
            </text>
          </g>
        );
      })}
    </>
  );

  return (
    <div className="relative flex h-full items-center border border-pale bg-white p-3 shadow-[0_30px_70px_-45px_rgba(30,58,92,0.5)]">
      <svg viewBox="0 0 860 620" className="h-full w-full" role="img" aria-label="Integration map: data sources flowing into the submission intelligence pipeline and out to the data plane">
        <g style={sceneStyle(0)}>
          {renderSourceConnectors(intakeRows, CENTER_X, CENTER_Y + 18, CENTER_Y + CENTER_H - 18, {
            strokeWidth: 1.3,
            selectedStrokeWidth: 2.4,
            showReadWriteOverlay: true,
          })}

          {syncRows.map(({ source, y }, rowIndex) => {
            const active = activeFor(source);
            const selected = selectedId === source.id;
            const dimmed = !active;
            const degraded = source.health === "degraded";
            const endpointX = SYNC_ENDPOINTS[Math.min(rowIndex, SYNC_ENDPOINTS.length - 1)] ?? 680;
            const d = `M ${LEFT_X + NODE_W} ${y + NODE_H / 2} C 430 ${
              y + NODE_H / 2
            }, 500 455, ${endpointX} ${SOR_1_Y + OUTPUT_NODE_H}`;

            return (
              <path
                key={`sync-${source.id}`}
                d={d}
                fill="none"
                className="flow-line"
                stroke={degraded ? "#f5b544" : "#2251ff"}
                strokeWidth={1.2}
                strokeDasharray="4 3"
                opacity={dimmed ? 0.1 : degraded ? 0.7 : selected ? 1 : 0.4}
              />
            );
          })}
          <MonoLabel x={345} y={450}>
            SYNC · POLLED
          </MonoLabel>

          <path
            d={edge(CENTER_X + CENTER_W, H / 2, SOR_1_X, H / 2)}
            fill="none"
            stroke="#2251ff"
            strokeWidth={1.8}
            opacity={selectedId ? 0.3 : 0.7}
          />

          <path
            d={`M ${SOR_1_X + RIGHT_NODE_W} ${H / 2} L ${W - 2} ${H / 2}`}
            fill="none"
            className="flow-line"
            stroke="#2251ff"
            strokeWidth={1.4}
            opacity={0.35}
          />
          <path
            d={edge(CENTER_X + CENTER_W / 2, CENTER_Y, LANGFUSE_X, LANGFUSE_Y + OUTPUT_NODE_H / 2)}
            fill="none"
            className="flow-line"
            stroke="#2251ff"
            strokeWidth={1.1}
            opacity={0.45}
          />
          <MonoLabel x={(CENTER_X + CENTER_W / 2 + LANGFUSE_X) / 2} y={(CENTER_Y + LANGFUSE_Y + OUTPUT_NODE_H / 2) / 2 - 8}>
            TRACES
          </MonoLabel>

          {renderSourceColumn(PREPARE_INTAKE_COLUMN.rows, PREPARE_INTAKE_COLUMN.headers)}
          <SubmissionHub />
          <SystemOfRecordNode x={SOR_1_X} y={SOR_1_Y} note="submissions + audit trail" />
          <LangfuseNode />
        </g>

        <g style={sceneStyle(1)}>
          <path
            d={`M 2 ${H / 2} L ${SOR_2_X} ${H / 2}`}
            fill="none"
            className="flow-line"
            stroke="#2251ff"
            strokeWidth={1.4}
            opacity={0.35}
          />
          <path
            d={edge(SOR_2_X + RIGHT_NODE_W, H / 2, WORKFLOW_X, H / 2)}
            fill="none"
            className="flow-line"
            stroke="#2251ff"
            strokeWidth={1.4}
            opacity={0.6}
            strokeDasharray="4 3"
          />
          <MonoLabel x={(SOR_2_X + RIGHT_NODE_W + WORKFLOW_X) / 2} y={H / 2 - 8}>
            TRIGGER
          </MonoLabel>

          <path
            d={edge(WORKFLOW_X + WORKFLOW_W, H / 2, OUTPUT_X, REVIEW_Y + OUTPUT_NODE_H / 2)}
            fill="none"
            className="flow-line"
            stroke="#2251ff"
            strokeWidth={1.4}
            opacity={0.6}
          />
          <path
            d={edge(WORKFLOW_X + WORKFLOW_W, H / 2, OUTPUT_X, DMS_Y + OUTPUT_NODE_H / 2)}
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
          <MonoLabel x={(WORKFLOW_X + WORKFLOW_W + OUTPUT_X) / 2} y={306}>
            ROUTES
          </MonoLabel>

          <SystemOfRecordNode x={SOR_2_X} y={SOR_2_Y} note="submissions + audit trail" />
          <WorkflowHub />
          <ConsumerNode id="human-review" y={REVIEW_Y} label="Human review queue" note="confidence-gated" />
          <ConsumerNode id="document-management" y={DMS_Y} label="Document management" note="write-back · on completion" />
          <ConsumerNode id="broker-follow-up-drafts" y={DRAFT_Y} label="Broker follow-up drafts" note="roadmap" ghost />
        </g>
      </svg>

      {/* bottom-right pager: arrows live beside the caption so they can never collide with the diagram */}
      <div className="absolute bottom-2.5 right-4 flex items-center gap-3">
        <span className="pointer-events-none font-fragment text-[9px] uppercase tracking-[0.16em] text-body/50">
          {SCENES[scene].caption}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Back to prepare and intake"
            disabled={scene === 0}
            onClick={() => setScene(0)}
            className="flex h-8 w-8 items-center justify-center border border-pale bg-white text-body shadow-[0_10px_24px_-18px_rgba(30,58,92,0.6)] transition-colors hover:border-cobalt hover:text-cobalt focus-visible:outline-2 focus-visible:outline-cobalt disabled:cursor-default disabled:opacity-30 disabled:hover:border-pale disabled:hover:text-body"
          >
            <ChevronLeft size={16} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next view: after the record"
            disabled={scene === 1}
            onClick={() => setScene(1)}
            className="flex h-8 w-8 items-center justify-center border border-pale bg-white text-body shadow-[0_10px_24px_-18px_rgba(30,58,92,0.6)] transition-colors hover:border-cobalt hover:text-cobalt focus-visible:outline-2 focus-visible:outline-cobalt disabled:cursor-default disabled:opacity-30 disabled:hover:border-pale disabled:hover:text-body"
          >
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
