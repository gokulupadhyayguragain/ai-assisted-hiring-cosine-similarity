"use client";

import { Download, FileArchive, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SkeletonCard } from "@/components/ui";
import type { AnalysisSession } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function RecruiterRankingsPage() {
  const [sessionId, setSessionId] = useState("");
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    const latest = window.localStorage.getItem("latest.sessionId");
    if (latest) { setSessionId(latest); load(latest); }
  }, []);

  async function load(target: string) {
    setLoading(true);
    const response = await fetch(`${API_BASE}/api/sessions/${target}`);
    const body = await response.json();
    if (response.ok) setSession(body);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!session) return [];
    const needle = query.trim().toLowerCase();
    return session.candidates.filter((item) => {
      if (item.score < minScore) return false;
      if (!needle) return true;
      return [item.display_name, item.source_filename, ...item.matched_skills, ...item.missing_skills].join(" ").toLowerCase().includes(needle);
    });
  }, [session, query, minScore]);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="display-title text-2xl md:text-3xl text-white">Rankings</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          <input className="field min-w-60 flex-1" placeholder="Session ID" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
          <button className="ghost-btn" type="button" onClick={() => load(sessionId)}>Load</button>
          {session && <a className="primary-btn" href={`${API_BASE}/api/sessions/${session.session_id}/export.csv`}><Download size={16} />CSV</a>}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_130px]">
          <label className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input className="field pl-9" placeholder="Search skills or file name" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <input className="field" type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
        </div>
      </div>

      <div className="space-y-2">
        {loading && (<><SkeletonCard /><SkeletonCard /><SkeletonCard /></>)}
        {!loading && filtered.map((candidate, index) => (
          <div key={candidate.candidate_id} className="glass-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-blue">Rank {index + 1}</p>
                <h3 className="text-lg font-semibold text-white">{candidate.display_name}</h3>
                <p className="text-sm text-zinc-400">{candidate.source_filename}</p>
              </div>
              <p className="font-mono text-2xl text-blue">{candidate.score}%</p>
            </div>
            <p className="mt-2 text-sm text-zinc-300">{candidate.summary}</p>
            <a className="ghost-btn mt-3 inline-flex" href={`${API_BASE}/api/sessions/${session?.session_id}/candidates/${candidate.candidate_id}/report.pdf`}>
              <FileArchive size={16} /> Transparency Report
            </a>
          </div>
        ))}
        {!loading && !session && <p className="text-sm text-zinc-400 text-center py-10">Load a session to view rankings.</p>}
      </div>
    </div>
  );
}
