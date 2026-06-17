"use client";

import { AlertTriangle, ShieldCheck, Search, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { AnalysisSession } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function HrBiasPage() {
  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    const latest = window.localStorage.getItem("latest.sessionId");
    if (!latest) return;
    setSessionId(latest);
    fetch(`${API_BASE}/api/sessions/${latest}`).then((r) => r.json()).then(setSession).catch(() => undefined);
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="display-title text-2xl md:text-3xl text-white inline-flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-blue" /> Bias Audit
        </h1>
        <p className="mt-1 text-sm text-zinc-400">Review bias detection findings across all screening sessions.</p>
        <div className="mt-4 flex gap-2">
          <input className="field min-w-60" placeholder="Session ID" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
          <button className="ghost-btn" onClick={async () => {
            try {
              const r = await fetch(`${API_BASE}/api/sessions/${sessionId}`);
              setSession(await r.json());
            } catch { setSession(null); }
          }}>Load</button>
        </div>
        {session && (
          <p className="mt-2 text-sm text-zinc-400">Audit Score: <span className="text-blue font-semibold">{session.bias_audit.score}%</span></p>
        )}
      </div>

      <div className="space-y-2">
        {session?.bias_audit.findings.length ? (
          session.bias_audit.findings.map((finding) => (
            <div key={`${finding.term}-${finding.category}`} className="glass-card p-4 border-l-4 border-amber-500/40">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold text-white">{finding.term}</p>
                  <p className="text-sm text-zinc-400">{finding.category} &bull; {finding.severity}</p>
                  <p className="mt-1 text-sm text-zinc-300">{finding.suggestion}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card p-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
            <p className="mt-3 text-sm text-zinc-400">No bias findings. Load a session to review.</p>
          </div>
        )}
      </div>
    </div>
  );
}
