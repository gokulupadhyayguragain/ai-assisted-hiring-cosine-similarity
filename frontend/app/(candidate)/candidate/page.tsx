"use client";

import { useState } from "react";
import { Brain, FileText, CheckCircle, Search } from "lucide-react";
import { apiUrl } from "@/lib/api";

export default function CandidateDashboard() {
  const [resume, setResume] = useState<File | null>(null);
  const [jobText, setJobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkFit = async () => {
    if (!resume || !jobText.trim()) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("resumes", resume);
      fd.append("job_text", jobText);
      fd.append("role", "job-seeker");
      fd.append("tfidf_weight", "0.65");

      const res = await fetch(apiUrl("/api/analyze"), { method: "POST", body: fd });
      if (res.ok) setResult(await res.json());
    } catch {}
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Candidate Workspace</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload your resume and see how you match against job descriptions.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fit Check */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Search className="h-5 w-5 text-blue" />
            Check Your Fit
          </h2>
          <div>
            <label className="text-xs text-gray-500">Your Resume</label>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => setResume(e.target.files?.[0] || null)}
              className="field mt-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-light file:text-blue file:text-xs file:px-3 file:py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Job Description</label>
            <textarea
              className="field mt-1 h-32 resize-y"
              placeholder="Paste the job description..."
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
            />
          </div>
          <button
            onClick={checkFit}
            disabled={loading || !resume || !jobText.trim()}
            className="primary-btn w-full justify-center"
          >
            {loading ? "Analyzing..." : "Check My Fit"}
          </button>

          {result && (
            <div className="space-y-3 mt-4">
              {result.candidates.map((c: any) => (
                <div key={c.candidate_id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Your Match Score</span>
                    <span className="text-2xl font-bold text-blue">
                      {Math.round(c.score)}%
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-emerald-50 p-2">
                      <p className="text-[10px] text-emerald-600 uppercase font-semibold">
                        Matched Skills
                      </p>
                      <p className="text-xs text-gray-900 mt-0.5">
                        {c.matched_skills.length}
                      </p>
                    </div>
                    <div className="rounded-lg bg-red-light p-2">
                      <p className="text-[10px] text-red uppercase font-semibold">
                        Skill Gaps
                      </p>
                      <p className="text-xs text-gray-900 mt-0.5">
                        {c.missing_skills.length}
                      </p>
                    </div>
                  </div>
                  {c.matched_skills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.matched_skills.map((s: string) => (
                        <span
                          key={s}
                          className="chip bg-emerald-50 text-emerald-600 text-[10px]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-light text-blue">
                <Brain className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  AI-Powered Analysis
                </h3>
                <p className="text-xs text-gray-500">
                  Get detailed skill gap analysis and match scores
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Fair & Anonymous
                </h3>
                <p className="text-xs text-gray-500">
                  Your identity is anonymized during screening to reduce bias
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Transparency Reports
                </h3>
                <p className="text-xs text-gray-500">
                  Download detailed PDF reports explaining your scores
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
