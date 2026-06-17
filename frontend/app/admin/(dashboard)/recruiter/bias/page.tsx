"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import type { AnalysisSession } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function RecruiterBiasPage() {
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    const latest = window.localStorage.getItem("latest.sessionId");
    if (!latest) return;
    setSessionId(latest);
    fetch(`${API_BASE}/api/sessions/${latest}`).then((r) => r.json()).then((body) => setSession(body)).catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="display-title text-2xl md:text-3xl text-white inline-flex items-center gap-2"><ShieldCheck size={22} className="text-blue" /> Bias Audit</h1>
        <p className="mt-2 text-sm text-zinc-400">Session {sessionId || "N/A"}</p>
        <p className="mt-2 text-sm text-zinc-400">Score: {session?.bias_audit.score ?? "—"}%</p>
      </div>

      <div className="space-y-2">
        {session?.bias_audit.findings.length ? (
          session.bias_audit.findings.map((finding) => (
            <div key={`${finding.term}-${finding.category}`} className="glass-card p-4">
              <p className="inline-flex items-center gap-2 text-amber-300"><AlertTriangle size={15} /> {finding.term}</p>
              <p className="mt-1 text-sm text-zinc-400">{finding.category} &bull; {finding.severity}</p>
              <p className="mt-2 text-sm text-zinc-300">{finding.suggestion}</p>
            </div>
          ))
        ) : (
          <div className="glass-card p-10 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="mt-3 text-sm text-zinc-400">No bias findings for current session.</p>
          </div>
        )}
      </div>
    </div>
  );
}
