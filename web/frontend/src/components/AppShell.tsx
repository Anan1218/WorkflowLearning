import { BarChart3, FileSearch, GitBranch, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { api } from "../lib/api";

const NAV = [
  { to: "/extract", label: "Extract", icon: FileSearch },
  { to: "/pipeline", label: "Pipeline", icon: GitBranch },
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
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-hairline bg-cloud/60 px-4 py-6">
        <div className="mb-8 px-2">
          <div className="eyebrow mb-1">Stello · Reference Architecture</div>
          <div className="font-newsreader text-xl leading-tight tracking-[-0.02em]">
            Submission
            <br />
            Intelligence
          </div>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Primary">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 font-schibsted text-[15px] transition-colors ${
                  isActive
                    ? "bg-white font-semibold text-cobalt shadow-sm"
                    : "text-bodyslate hover:bg-white/70 hover:text-ink"
                }`
              }
            >
              <Icon size={16} strokeWidth={2} aria-hidden />
              {label}
              {label === "Review" && (pending?.length ?? 0) > 0 && (
                <span className="ml-auto rounded-full bg-flag-bg px-2 py-0.5 font-fragment text-[10px] text-flag">
                  {pending!.length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2">
          <p className="font-fragment text-[10px] leading-relaxed text-bodyslate/70">
            Surety submission ingestion demo.
            <br />
            Schema-first · model-agnostic · traced.
          </p>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-10 py-8">{children}</main>
    </div>
  );
}
