"use client";

import { AlertTriangle, ShieldCheck, Search, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const sampleFindings = [
  { id: "f1", term: "aggressive", category: "Tone", severity: "high", suggestion: "Replace with 'driven' or 'proactive'", session: "SES-001" },
  { id: "f2", term: "rockstar", category: "Inclusive Language", severity: "medium", suggestion: "Use 'exceptional' or 'top-tier'", session: "SES-001" },
  { id: "f3", term: "ninja", category: "Inclusive Language", severity: "medium", suggestion: "Use 'expert' or 'specialist'", session: "SES-002" },
  { id: "f4", term: "young", category: "Age Bias", severity: "high", suggestion: "Remove age-related language entirely", session: "SES-003" },
  { id: "f5", term: "man-hours", category: "Gendered Language", severity: "high", suggestion: "Use 'person-hours' or 'work hours'", session: "SES-004" },
  { id: "f6", term: "culture fit", category: "Inclusive Language", severity: "medium", suggestion: "Use 'values alignment' instead", session: "SES-001" },
];

export default function AuditsPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = sampleFindings.filter((f) => {
    const needle = query.toLowerCase();
    const matchesQuery = !needle || f.term.toLowerCase().includes(needle) || f.category.toLowerCase().includes(needle);
    const matchesFilter = filter === "all" || f.severity === filter;
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-2xl md:text-3xl text-white">Bias Audits</h1>
        <p className="mt-1 text-sm text-zinc-400">Review bias detection findings across all screening sessions.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input className="field pl-9" placeholder="Search terms or categories..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {["all", "high", "medium", "low"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all capitalize ${
                filter === s ? "bg-blue/20 text-blue" : "text-zinc-400 hover:text-white"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass-card p-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="mt-3 text-zinc-400">No bias findings match your filters.</p>
          </div>
        ) : (
          filtered.map((finding) => (
            <div
              key={finding.id}
              className={`glass-card overflow-hidden border-l-4 ${
                finding.severity === "high" ? "border-red/40 bg-red/10" :
                finding.severity === "medium" ? "border-amber-500/40 bg-amber-500/10" :
                "border-blue/40 bg-blue/10"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                  <div>
                    <p className="font-semibold text-white">{finding.term}</p>
                    <p className="mt-0.5 text-sm text-zinc-400">{finding.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`chip text-xs capitalize ${
                    finding.severity === "high" ? "bg-red/15 text-red-soft" :
                    finding.severity === "medium" ? "bg-amber-500/15 text-amber-300" :
                    "bg-blue/15 text-blue-soft"
                  }`}>
                    {finding.severity}
                  </span>
                  <span className="text-xs text-zinc-500">{finding.session}</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-zinc-300 border-t border-white/5 pt-3">
                <span className="text-zinc-500">Suggestion:</span> {finding.suggestion}
              </p>
            </div>
          ))
        )}
      </div>

      <div className="glass-card p-4 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-blue" />
        <p className="text-sm text-zinc-400">
          Bias detection runs automatically on job descriptions during the screening pipeline. Findings are stored per session.
        </p>
      </div>
    </div>
  );
}
