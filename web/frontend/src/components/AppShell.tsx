import { BarChart3, Database, FileSearch, GitBranch, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";

const NAV = [
  { to: "/extract", label: "Extract", icon: FileSearch },
  { to: "/pipeline", label: "Pipeline", icon: GitBranch },
  { to: "/sources", label: "Sources", icon: Database },
  { to: "/evals", label: "Evals", icon: BarChart3 },
  { to: "/review", label: "Review", icon: Inbox },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { data: pending } = useQuery({
    queryKey: ["review", "pending-count"],
    queryFn: () => api.reviewList("pending"),
    refetchInterval: 10_000,
  });

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-canvas text-body">
      {/* ambient background: dot grid + radial washes */}
      <div className="dot-grid-light pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute -left-40 -top-40 h-[40rem] w-[40rem] rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(169,196,232,0.5), transparent 65%)" }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[40rem] w-[40rem] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(34,81,255,0.16), transparent 65%)" }}
        />
      </div>

      {/* frosted header */}
      <header className="relative z-10 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white/80 px-5 backdrop-blur-md">
        <span className="font-newsreader text-[1.35rem] font-medium tracking-tight text-ink">
          Stello
        </span>
        <span className="bg-navy px-2.5 py-1 font-fragment text-[9px] font-semibold uppercase tracking-[0.2em] text-white">
          Submission Intelligence
        </span>
        <span className="ml-auto hidden font-fragment text-[10px] uppercase tracking-[0.12em] text-body/50 sm:block">
          Schema-first · model-agnostic · traced
        </span>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1">
        {/* nav rail */}
        <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-line px-3 py-5">
          <div className="mb-2 px-3 font-fragment text-[10px] uppercase tracking-[0.2em] text-body/50">
            Console
          </div>
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `relative flex items-center gap-2.5 px-3.5 py-2.5 font-schibsted text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-cobalt ${
                  isActive
                    ? "bg-white text-ink shadow-[0_14px_30px_-22px_rgba(30,58,92,0.5)] ring-1 ring-pale"
                    : "text-body hover:bg-white/60 hover:text-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-y-0 left-0 w-[3px] bg-cobalt" aria-hidden />}
                  <Icon size={16} strokeWidth={2} aria-hidden />
                  {label}
                  {label === "Review" && (pending?.length ?? 0) > 0 && (
                    <span className="ml-auto rounded-full bg-flag/10 px-2 py-0.5 font-fragment text-[10px] text-flag">
                      {pending!.length}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </aside>

        {/* scrolling stage area */}
        <main className="thin-scroll min-w-0 flex-1 overflow-y-auto px-10 py-9">{children}</main>
      </div>

      {/* status footer */}
      <footer className="relative z-10 flex h-8 shrink-0 items-center justify-between border-t border-line bg-white/70 px-5 font-fragment text-[10px] uppercase tracking-[0.12em] text-body/50 backdrop-blur-sm">
        <span>Instructor + Pydantic · one-string model swap</span>
        <span>traced via OTel → Langfuse</span>
      </footer>
    </div>
  );
}
