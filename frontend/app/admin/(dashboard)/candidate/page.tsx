"use client";

import { FileText, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { ChangeEvent, FormEvent, useState } from "react";
import type { AnalysisSession } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function CandidateWorkspacePage() {
  const [jobText, setJobText] = useState("");
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState<AnalysisSession | null>(null);

  async function runMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resume) return;
    setLoading(true); setError("");
    try {
      const form = new FormData();
      form.append("resumes", resume);
      if (jobFile) form.append("job_file", jobFile);
      if (jobText.trim()) form.append("job_text", jobText);
      form.append("role", "job-seeker");
      form.append("tfidf_weight", "0.65");
      const response = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Could not run match");
      setSession(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not run match");
    } finally { setLoading(false); }
  }

  const result = session?.candidates[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <form className="glass-card p-6" onSubmit={runMatch}>
        <h1 className="text-2xl font-semibold text-white">Candidate Workspace</h1>
        <p className="mt-1 text-sm text-zinc-400">Upload your resume and target job to get skill-based feedback.</p>

        <label className="mt-5 block space-y-2">
          <span className="text-sm text-zinc-300">Job description</span>
          <textarea className="field min-h-48" value={jobText} onChange={(e) => setJobText(e.target.value)} placeholder="Paste job description" />
        </label>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="rounded-2xl border border-dashed border-white/30 bg-white/5 p-4 text-sm cursor-pointer">
            <span className="inline-flex items-center gap-2 text-zinc-200">
              <FileText size={16} className="text-blue" /> {jobFile ? jobFile.name : "Attach job file"}
            </span>
            <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => setJobFile(e.target.files?.[0] || null)} />
          </label>
          <label className="rounded-2xl border border-dashed border-white/30 bg-white/5 p-4 text-sm cursor-pointer">
            <span className="inline-flex items-center gap-2 text-zinc-200">
              <UploadCloud size={16} className="text-blue" /> {resume ? resume.name : "Upload your resume"}
            </span>
            <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={(e) => setResume(e.target.files?.[0] || null)} />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-200">{error}</p>}

        <button className="primary-btn mt-5" type="submit" disabled={!resume || (!jobFile && !jobText.trim()) || loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Analyze Resume Fit
        </button>
      </form>

      <aside className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white">Your Result</h2>
        {!result ? (
          <p className="mt-3 text-sm text-zinc-400">Run analysis to see your score and gap suggestions.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">Match Score</p>
              <p className="mt-1 font-mono text-3xl font-semibold text-blue">{result.score}%</p>
            </div>
            <p className="text-sm text-zinc-300">{result.summary}</p>
            <div>
              <p className="text-sm font-semibold text-white">Matched Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.matched_skills.map((skill) => (
                  <span key={skill} className="chip chip-good">{skill}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Missing Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.missing_skills.map((skill) => (
                  <span key={skill} className="chip chip-miss">{skill}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
