"use client";

import { useState } from "react";
import { GitCompare, UploadCloud, AlertTriangle, FileText, CheckCircle2, XCircle } from "lucide-react";
import { PdfViewer } from "@/components/hr/pdf-viewer";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

interface ComparedSkill {
  skill: string;
  left: boolean;
  right: boolean;
}

export default function HrComparePage() {
  const [leftFile, setLeftFile] = useState<File | null>(null);
  const [rightFile, setRightFile] = useState<File | null>(null);
  const [leftUrl, setLeftUrl] = useState<string | null>(null);
  const [rightUrl, setRightUrl] = useState<string | null>(null);
  const [comparison, setComparison] = useState<{
    leftName: string;
    rightName: string;
    leftScore: number;
    rightScore: number;
    similarity: number;
    skills: ComparedSkill[];
    recommendation: string;
    duplicateWarning?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleLeftFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setLeftFile(file);
    if (file) setLeftUrl(URL.createObjectURL(file));
  }

  function handleRightFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setRightFile(file);
    if (file) setRightUrl(URL.createObjectURL(file));
  }

  async function runComparison() {
    if (!leftFile || !rightFile) return;
    setLoading(true); setError("");

    try {
      const form = new FormData();
      form.append("resume_a", leftFile);
      form.append("resume_b", rightFile);
      const response = await fetch(`${API_BASE}/api/compare`, { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Comparison failed");

      setComparison({
        leftName: data.resume_a_name || leftFile.name,
        rightName: data.resume_b_name || rightFile.name,
        leftScore: data.resume_a_score || 0,
        rightScore: data.resume_b_score || 0,
        similarity: data.similarity,
        skills: (data.skills_comparison || data.shared_skills || []).map((s: string) => ({
          skill: s,
          left: true,
          right: true,
        })),
        recommendation: data.recommendation || "Manual review recommended.",
        duplicateWarning: data.duplicate_warning,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-2xl md:text-3xl text-white">Compare Resumes</h1>
        <p className="mt-1 text-sm text-zinc-400">Side-by-side visual comparison with skill overlap analysis and tie-breaking.</p>
      </div>

      {/* File upload */}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="glass-card p-6 text-center cursor-pointer hover:border-white/20 transition-all">
          <UploadCloud className="mx-auto h-8 w-8 text-blue" />
          <p className="mt-2 text-sm text-zinc-300">{leftFile ? leftFile.name : "Upload Resume A"}</p>
          <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={handleLeftFile} />
        </label>
        <label className="glass-card p-6 text-center cursor-pointer hover:border-white/20 transition-all">
          <UploadCloud className="mx-auto h-8 w-8 text-red-soft" />
          <p className="mt-2 text-sm text-zinc-300">{rightFile ? rightFile.name : "Upload Resume B"}</p>
          <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={handleRightFile} />
        </label>
      </div>

      <div className="flex justify-center">
        <button
          className="primary-btn inline-flex items-center gap-2"
          disabled={!leftFile || !rightFile || loading}
          onClick={runComparison}
        >
          {loading ? "Comparing..." : <><GitCompare className="h-4 w-4" /> Compare Resumes</>}
        </button>
      </div>

      {error && (
        <div className="glass-card p-4 border-l-4 border-red/40 bg-red/10">
          <p className="text-sm text-red-soft">{error}</p>
        </div>
      )}

      {/* Comparison results */}
      {comparison && (
        <>
          {comparison.duplicateWarning && (
            <div className="glass-card p-4 border-l-4 border-red/40 bg-red/10">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-soft shrink-0" />
                <div>
                  <p className="font-semibold text-white">Duplicate Detected</p>
                  <p className="text-sm text-zinc-300">{comparison.duplicateWarning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Score comparison */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-card p-5 text-center">
              <p className="text-sm text-zinc-400">{comparison.leftName}</p>
              <p className="mt-2 font-mono text-3xl text-blue">{comparison.leftScore}%</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="text-sm text-zinc-400">Similarity</p>
              <p className="mt-2 font-mono text-3xl text-amber-400">{comparison.similarity}%</p>
            </div>
            <div className="glass-card p-5 text-center">
              <p className="text-sm text-zinc-400">{comparison.rightName}</p>
              <p className="mt-2 font-mono text-3xl text-red-soft">{comparison.rightScore}%</p>
            </div>
          </div>

          {/* Skill comparison */}
          {comparison.skills.length > 0 && (
            <div className="glass-card p-5">
              <h2 className="font-semibold text-white">Skill Overlap</h2>
              <div className="mt-3 space-y-2">
                {comparison.skills.map((s) => (
                  <div key={s.skill} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                    <span className="text-sm text-zinc-300">{s.skill}</span>
                    <div className="flex items-center gap-3">
                      {s.left ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-zinc-600" />}
                      {s.right ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-zinc-600" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div className="glass-card p-5">
            <h2 className="font-semibold text-white">Recommendation</h2>
            <p className="mt-2 text-sm text-zinc-300">{comparison.recommendation}</p>
          </div>

          {/* Side-by-side viewer */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-300">{comparison.leftName}</p>
              {leftUrl && <PdfViewer fileUrl={leftUrl} fileName={comparison.leftName} />}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-zinc-300">{comparison.rightName}</p>
              {rightUrl && <PdfViewer fileUrl={rightUrl} fileName={comparison.rightName} />}
            </div>
          </div>
        </>
      )}

      {!comparison && !error && (
        <div className="glass-card p-10 text-center">
          <GitCompare className="mx-auto h-8 w-8 text-zinc-500" />
          <p className="mt-3 text-sm text-zinc-400">Upload two resumes to compare them side by side.</p>
        </div>
      )}
    </div>
  );
}
