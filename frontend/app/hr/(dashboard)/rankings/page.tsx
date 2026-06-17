"use client";

import { Download, FileArchive, Search, GitCompare, AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SkeletonCard } from "@/components/ui";
import type { AnalysisSession } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function HrRankingsPage() {
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

  // Detect ties and duplicates
  const { filtered, tiedGroups, duplicates } = useMemo(() => {
    if (!session) return { filtered: [], tiedGroups: [] as number[][], duplicates: [] as string[] };
    const needle = query.trim().toLowerCase();
    const candidates = session.candidates.filter((item) => {
      if (item.score < minScore) return false;
      if (!needle) return true;
      return [item.display_name, item.source_filename, ...item.matched_skills, ...item.missing_skills].join(" ").toLowerCase().includes(needle);
    });

    // Find ties (same score) within the filtered set
    const scoreMap = new Map<number, number[]>();
    candidates.forEach((c, i) => {
      const existing = scoreMap.get(c.score) || [];
      existing.push(i);
      scoreMap.set(c.score, existing);
    });
    const tiedGroups = Array.from(scoreMap.values()).filter((g) => g.length > 1);

    // Find duplicates (same extracted text content)
    const seen = new Map<string, string>();
    const dups: string[] = [];
    candidates.forEach((c) => {
      const key = c.summary.slice(0, 100);
      if (seen.has(key)) {
        dups.push(c.candidate_id);
        dups.push(seen.get(key)!);
      } else {
        seen.set(key, c.candidate_id);
      }
    });

    return { filtered: candidates, tiedGroups, duplicates: [...new Set(dups)] };
  }, [session, query, minScore]);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="display-title text-2xl md:text-3xl text-white">Rankings</h1>
            <p className="mt-1 text-sm text-zinc-400">Candidate rankings with tied-score detection and duplicate alerts.</p>
          </div>
          {session && (
            <Link href="/hr/compare" className="primary-btn inline-flex items-center gap-2">
              <GitCompare className="h-4 w-4" /> Compare Resumes
            </Link>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <input className="field min-w-60 flex-1" placeholder="Session ID" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
          <button className="ghost-btn" onClick={() => load(sessionId)}>Load</button>
          {session && <a className="primary-btn" href={`${API_BASE}/api/sessions/${session.session_id}/export.csv`}><Download size={16} />CSV</a>}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-[1fr_130px]">
          <label className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input className="field pl-9" placeholder="Search skills or file name" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <input className="field" type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} placeholder="Min score" />
        </div>
      </div>

      {/* Duplicate alert */}
      {duplicates.length > 0 && (
        <div className="glass-card p-4 border-l-4 border-red/40 bg-red/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-soft" />
            <div>
              <p className="font-semibold text-white">Duplicate Candidates Detected</p>
              <p className="text-sm text-zinc-300">
                {duplicates.length} candidates appear to have identical CV content. 
                Only the name differs — these should be reviewed and disqualified if confirmed duplicates.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {loading && (<><SkeletonCard /><SkeletonCard /><SkeletonCard /></>)}
        {!loading && filtered.map((candidate, index) => {
          const isTied = tiedGroups.some((g) => g.includes(index));
          const isDup = duplicates.includes(candidate.candidate_id);
          return (
            <div key={candidate.candidate_id} className={`glass-card p-4 ${isDup ? 'opacity-60 border-red/30' : ''} ${isTied ? 'border-l-4 border-amber-500' : ''}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-blue">
                    Rank {index + 1}
                    {isTied && <span className="ml-2 text-amber-400">(Tied)</span>}
                    {isDup && <span className="ml-2 text-red-400">(Duplicate)</span>}
                  </p>
                  <h3 className="text-lg font-semibold text-white">{candidate.display_name}</h3>
                  <p className="text-sm text-zinc-400">{candidate.source_filename}</p>
                </div>
                <p className="font-mono text-2xl text-blue">{candidate.score}%</p>
              </div>
              <p className="mt-2 text-sm text-zinc-300">{candidate.summary}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {candidate.matched_skills.slice(0, 8).map((skill) => (
                  <span key={skill} className="chip bg-blue/10 text-blue-soft text-xs">{skill}</span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <a className="ghost-btn text-xs" href={`${API_BASE}/api/sessions/${session?.session_id}/candidates/${candidate.candidate_id}/report.pdf`}>
                  <FileArchive size={14} /> Report
                </a>
                {isTied && (
                  <Link href={`/hr/compare?candidate1=${candidate.candidate_id}`} className="ghost-btn text-xs">
                    <GitCompare size={14} /> Compare
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {!loading && !session && <p className="text-sm text-zinc-400 text-center py-10">Load a session to view rankings.</p>}
      </div>

      {tiedGroups.length > 0 && (
        <div className="glass-card p-4">
          <p className="font-semibold text-white">Tie-breaking Recommendations</p>
          <p className="mt-1 text-sm text-zinc-400">
            {tiedGroups.length} tie group(s) detected. Candidates with identical scores should be compared 
            manually using the Compare Resumes tool. Secondary criteria (experience depth, skill coverage 
            breadth, communication clarity scores) can be used to break ties automatically.
          </p>
        </div>
      )}
    </div>
  );
}
