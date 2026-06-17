"use client";

import { Download, FileSearch } from "lucide-react";
import { FormEvent, useState } from "react";

import type { AnalysisSession } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function ReportsPage() {
  const [sessionId, setSessionId] = useState("");
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [error, setError] = useState("");

  async function load(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSession(null);

    const response = await fetch(`${API_BASE}/api/sessions/${sessionId.trim()}`);
    const body = await response.json();
    if (!response.ok) {
      setError(body.detail || "Session not found");
      return;
    }
    setSession(body);
  }

  return (
      <section className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <form className="glass rounded-3xl border border-white/10 p-6" onSubmit={load}>
          <h1 className="text-2xl font-semibold">Transparency reports</h1>
          <p className="mt-2 text-sm text-slate-300">Fetch any completed session and download CSV or per-candidate PDF reports.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input className="field min-w-64 flex-1" placeholder="Session ID" value={sessionId} onChange={(event) => setSessionId(event.target.value)} />
            <button className="primary-btn" type="submit">
              <FileSearch size={16} /> Load Session
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-200">{error}</p>}
        </form>

        {session && (
          <section className="glass rounded-3xl border border-white/10 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Session {session.session_id}</h2>
              <a className="ghost-btn" href={`${API_BASE}/api/sessions/${session.session_id}/export.csv`}>
                <Download size={16} /> Download CSV
              </a>
            </div>
            <div className="mt-4 space-y-2">
              {session.candidates.map((candidate) => (
                <div key={candidate.candidate_id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">
                      {candidate.display_name} ({candidate.candidate_id})
                    </p>
                    <a
                      className="ghost-btn"
                      href={`${API_BASE}/api/sessions/${session.session_id}/candidates/${candidate.candidate_id}/report.pdf`}
                    >
                      <Download size={16} /> PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </section>
  );
}
