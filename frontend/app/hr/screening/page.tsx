"use client";

import { useState } from "react";
import { Upload, FileText, BarChart3, Loader2, Download, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { TieBreakSummary } from "@/components/hr/tie-break-summary";

export default function ScreeningPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [jobText, setJobText] = useState("");
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const runScreening = async () => {
    if (files.length === 0 || (!jobText.trim() && !jobFile)) {
      setError("Upload at least one resume and provide a job description.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("resumes", f));
      if (jobFile) {
        fd.append("job_file", jobFile);
      } else {
        fd.append("job_text", jobText);
      }
      fd.append("role", "recruiter");
      fd.append("tfidf_weight", "0.65");

      const res = await fetch(apiUrl("/api/analyze"), { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Screening failed");
      } else {
        setResult(await res.json());
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
        <h1 className="display-title text-3xl text-white">Run Screening</h1>
        <p className="mt-1 text-sm text-zinc-400">Upload resumes and run AI-powered screening against a job description.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <div className="glass-card p-6 space-y-4">
          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Job Description</label>
            <textarea
              className="field mt-2 h-32 resize-y"
              placeholder="Paste job description text..."
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
            />
            <p className="mt-1 text-xs text-zinc-600">Or upload a JD file:</p>
            <input type="file" accept=".txt,.pdf,.docx,.md" onChange={(e) => setJobFile(e.target.files?.[0] || null)} className="field mt-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue/15 file:text-blue file:text-xs file:px-3 file:py-1.5" />
          </div>

          <div>
            <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Resumes / CVs</label>
            <input type="file" multiple accept=".pdf,.docx,.txt,.md" onChange={handleFileDrop} className="field mt-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue/15 file:text-blue file:text-xs file:px-3 file:py-1.5" />
            {files.length > 0 && (
              <div className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                    <FileText className="h-3 w-3 text-blue" />
                    {f.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red/10 p-3 text-xs text-red-soft">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </div>
          )}

          <button onClick={runScreening} disabled={loading || files.length === 0} className="primary-btn w-full justify-center">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {loading ? "Screening..." : "Run Screening"}
          </button>
        </div>

        {/* Results */}
        <div>
          {result ? (
            <div className="space-y-4">
              <div className="glass-card p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">
                    <CheckCircle className="inline h-4 w-4 text-emerald-400 mr-2" />
                    Screening Complete
                  </h2>
                  <a href={apiUrl(`/api/sessions/${result.session_id}/export.csv`)} target="_blank" className="ghost-btn text-xs">
                    <Download className="h-3.5 w-3.5" /> CSV
                  </a>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  {result.candidates.length} candidates · {result.processing_ms}ms · Score weight: {Math.round(result.engine.tfidf_weight * 100)}% TF-IDF / {Math.round(result.engine.semantic_weight * 100)}% Semantic
                </p>
                {result.bias_audit && (
                  <p className="mt-2 text-xs">
                    <span className="text-zinc-500">JD Bias Score:</span>{" "}
                    <span className={result.bias_audit.score < 70 ? "text-red-soft" : result.bias_audit.score < 90 ? "text-amber-500" : "text-emerald-400"}>
                      {result.bias_audit.score}/100
                    </span>
                  </p>
                )}
              </div>

              {/* Tie-Breaking Summary */}
              {result.candidates.length >= 2 && (
                <TieBreakSummary candidates={result.candidates} threshold={5} />
              )}

              {/* Candidate Rankings */}
              <div className="space-y-3">
                {result.candidates.map((c: any, i: number) => (
                  <div key={c.candidate_id} className="glass-card p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue/15 text-sm font-bold text-blue">
                          {i + 1}
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-white">{c.display_name || c.source_filename}</h3>
                          <p className="text-xs text-zinc-500">{c.source_filename}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{Math.round(c.score * 100)}%</p>
                        <p className="text-xs text-zinc-600">Overall</p>
                      </div>
                    </div>

                    {/* Score breakdown */}
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-white/5 p-2.5">
                        <p className="text-xs text-zinc-500">TF-IDF</p>
                        <p className="text-sm font-semibold text-white">{Math.round(c.tfidf_score * 100)}%</p>
                      </div>
                      <div className="rounded-lg bg-white/5 p-2.5">
                        <p className="text-xs text-zinc-500">Semantic</p>
                        <p className="text-sm font-semibold text-white">{Math.round(c.semantic_score * 100)}%</p>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.matched_skills.map((s: string) => (
                        <span key={s} className="chip bg-emerald-500/10 text-emerald-400 text-xs">{s}</span>
                      ))}
                      {c.missing_skills.map((s: string) => (
                        <span key={s} className="chip bg-red/10 text-red-soft text-xs line-through">{s}</span>
                      ))}
                    </div>

                    {c.experience_years !== null && (
                      <p className="mt-2 text-xs text-zinc-500">Experience: {c.experience_years} years</p>
                    )}

                    <p className="mt-2 text-xs text-zinc-400 line-clamp-2">{c.summary}</p>

                    <div className="mt-3 flex gap-2">
                      <Link href={`/hr/compare?candidate_a=${c.candidate_id}`} className="ghost-btn text-xs py-1.5">
                        Compare
                      </Link>
                      <a href={apiUrl(`/api/sessions/${result.session_id}/candidates/${c.candidate_id}/report.pdf`)} target="_blank" className="ghost-btn text-xs py-1.5">
                        <Download className="h-3 w-3" /> Report
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <Upload className="mx-auto h-8 w-8 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-500">Upload resumes and a JD to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
