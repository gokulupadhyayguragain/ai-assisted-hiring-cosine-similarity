"use client";

import { useState } from "react";
import { ShieldCheck, AlertTriangle, Loader2, FileText, CheckCircle, X } from "lucide-react";
import { apiUrl } from "@/lib/api";

export default function BiasAuditPage() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const runAudit = async () => {
    if (!text.trim()) {
      setError("Enter a job description to audit.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("job_text", text);
      fd.append("role", "recruiter");
      fd.append("tfidf_weight", "0.65");

      const res = await fetch(apiUrl("/api/analyze"), {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Audit failed");
      } else {
        const data = await res.json();
        setResult(data.bias_audit || null);
      }
    } catch {
      setError("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl text-white">Bias Audits</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Scan job descriptions for biased language and get fair-hiring recommendations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-6 space-y-4">
          <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
            Job Description Text
          </label>
          <textarea
            className="field h-64 resize-y"
            placeholder="Paste your job description here to scan for biased language..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red/10 p-3 text-xs text-red-soft">
              <AlertTriangle className="h-3.5 w-3.5" /> {error}
            </div>
          )}
          <button onClick={runAudit} disabled={loading || !text.trim()} className="primary-btn w-full justify-center">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {loading ? "Scanning..." : "Run Bias Audit"}
          </button>
        </div>

        <div>
          {result ? (
            <div className="space-y-4">
              <div className={`glass-card p-6 ${result.score < 70 ? "border-red/30" : result.score < 90 ? "border-amber-500/30" : "border-emerald-500/30"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {result.score < 70 ? (
                      <AlertTriangle className="h-6 w-6 text-red-soft" />
                    ) : result.score < 90 ? (
                      <AlertTriangle className="h-6 w-6 text-amber-500" />
                    ) : (
                      <CheckCircle className="h-6 w-6 text-emerald-400" />
                    )}
                    <div>
                      <h2 className="text-lg font-semibold text-white">Fairness Score</h2>
                      <p className="text-xs text-zinc-500">
                        {result.score < 70
                          ? "High bias detected — revision recommended"
                          : result.score < 90
                          ? "Minor bias detected — consider improvements"
                          : "Looks good — minimal bias detected"}
                      </p>
                    </div>
                  </div>
                  <span className={`text-3xl font-bold ${result.score < 70 ? "text-red-soft" : result.score < 90 ? "text-amber-500" : "text-emerald-400"}`}>
                    {result.score}/100
                  </span>
                </div>
              </div>

              {result.findings.length > 0 ? (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-semibold text-white mb-3">
                    Findings ({result.findings.length})
                  </h3>
                  <div className="space-y-3">
                    {result.findings.map((f: any, i: number) => (
                      <div key={i} className="rounded-xl bg-white/5 p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-red-soft bg-red/10 px-2 py-0.5 rounded">"{f.term}"</span>
                          <span className={`chip text-[10px] ${
                            f.severity === "high" ? "bg-red/15 text-red-soft" :
                            f.severity === "medium" ? "bg-amber-500/15 text-amber-500" :
                            "bg-zinc-500/15 text-zinc-400"
                          }`}>{f.severity}</span>
                          <span className="text-xs text-zinc-500">{f.category}</span>
                        </div>
                        <p className="mt-2 text-xs text-zinc-400">{f.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="glass-card p-6 text-center">
                  <CheckCircle className="mx-auto h-6 w-6 text-emerald-400" />
                  <p className="mt-2 text-sm text-zinc-300">No biased language found — your JD looks fair!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-500">Enter a job description and run an audit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
