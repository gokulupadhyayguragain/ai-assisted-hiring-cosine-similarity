"use client";

import { BarChart3, Loader2, Sparkles, UploadCloud } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { loadDraft } from "@/lib/jobs";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function RecruiterProcessPage() {
  const [jobText, setJobText] = useState("");
  const [jobFile, setJobFile] = useState<File | null>(null);
  const [resumes, setResumes] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const draft = loadDraft();
    if (draft?.description) setJobText(draft.description);
  }, []);

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const form = new FormData();
      resumes.forEach((resume) => form.append("resumes", resume));
      if (jobFile) form.append("job_file", jobFile);
      if (jobText.trim()) form.append("job_text", jobText);
      form.append("role", "recruiter");
      form.append("tfidf_weight", "0.65");
      const response = await fetch(`${API_BASE}/api/analyze`, { method: "POST", body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Analysis failed");
      window.localStorage.setItem("latest.sessionId", body.session_id);
      window.location.href = "/admin/recruiter/rankings";
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Analysis failed"); }
    finally { setLoading(false); }
  }

  const pipeline = ["Extract text", "Anonymize PII", "TF-IDF vectors", "Semantic scoring", "Cosine ranking", "Skill gaps", "Bias audit", "Transparency reports"];

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h1 className="display-title text-2xl md:text-3xl text-white">Processing</h1>
        <p className="mt-2 text-sm text-zinc-400">Upload documents and run the full anonymize-vectorize-rank pipeline.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {pipeline.map((step) => (
            <div key={step} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">
              <span className="inline-flex items-center gap-2"><Sparkles size={14} className="text-blue" />{step}</span>
            </div>
          ))}
        </div>
      </div>

      <form className="glass-card p-6" onSubmit={run}>
        <label className="space-y-2">
          <span className="text-sm text-zinc-300">Job description</span>
          <textarea className="field min-h-44" value={jobText} onChange={(e) => setJobText(e.target.value)} />
        </label>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="rounded-2xl border border-dashed border-white/30 bg-white/5 p-4 text-sm text-zinc-200 cursor-pointer">
            Job file: {jobFile ? jobFile.name : "Attach .pdf/.docx/.txt/.md"}
            <input type="file" accept=".pdf,.docx,.txt,.md" className="mt-3 block w-full text-xs" onChange={(e: ChangeEvent<HTMLInputElement>) => setJobFile(e.target.files?.[0] || null)} />
          </label>
          <label className="rounded-2xl border border-dashed border-white/30 bg-white/5 p-4 text-sm text-zinc-200 cursor-pointer">
            <span className="inline-flex items-center gap-2"><UploadCloud size={16} className="text-blue" /> Resumes: {resumes.length}</span>
            <input type="file" multiple accept=".pdf,.docx,.txt,.md" className="mt-3 block w-full text-xs" onChange={(e: ChangeEvent<HTMLInputElement>) => setResumes(Array.from(e.target.files || []))} />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-200">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <button className="primary-btn" type="submit" disabled={loading || resumes.length === 0 || (!jobFile && !jobText.trim())}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />} Run AI Screening
          </button>
          <Link href="/admin/recruiter/upload" className="ghost-btn">Back to Upload</Link>
        </div>
      </form>
    </div>
  );
}
