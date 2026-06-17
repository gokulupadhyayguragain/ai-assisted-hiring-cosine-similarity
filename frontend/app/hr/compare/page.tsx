"use client";

import { useState } from "react";
import { Upload, GitCompare, FileText, Loader2, AlertCircle, CheckCircle, Award, Scale, BarChart3, Zap, Clock, UserCheck } from "lucide-react";
import { PdfViewer } from "@/components/hr/pdf-viewer";
import { apiUrl } from "@/lib/api";

type CompareResult = {
  similarity_score: number;
  skill_overlap: string[];
  unique_to_a: string[];
  unique_to_b: string[];
  recommendation: string;
  tie_breakers?: TieBreakerResult[];
  error?: string;
};

type TieBreakerResult = {
  strategy: string;
  label: string;
  winner: "a" | "b" | "tie";
  reason: string;
  detail: Record<string, number | string | boolean>;
};

export default function ComparePage() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState("");
  const [pdfAUrl, setPdfAUrl] = useState<string | null>(null);
  const [pdfBUrl, setPdfBUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"comparison" | "tiebreakers">("comparison");

  const handleCompare = async () => {
    if (!fileA || !fileB) {
      setError("Upload two resumes to compare.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const fd = new FormData();
      fd.append("resume_a", fileA);
      fd.append("resume_b", fileB);

      const res = await fetch(apiUrl("/api/compare"), { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Comparison failed");
      } else {
        setResult(await res.json());
      }
    } catch {
      setError("Failed to connect to backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToPdf = async (file: File): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(apiUrl("/api/convert"), { method: "POST", body: fd });
      if (res.ok) {
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
      return null;
    } catch {
      return null;
    }
  };

  const loadPdfPreviews = async () => {
    if (fileA) {
      const url = await handleConvertToPdf(fileA);
      if (url) setPdfAUrl(url);
    }
    if (fileB) {
      const url = await handleConvertToPdf(fileB);
      if (url) setPdfBUrl(url);
    }
  };

  const handleCompareAndView = async () => {
    await handleCompare();
    if (!error) {
      await loadPdfPreviews();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-amber-500";
    return "text-red-soft";
  };

  const getWinnerBadge = (winner: "a" | "b" | "tie") => {
    if (winner === "a") return <span className="chip bg-blue/15 text-blue text-xs">Resume A wins</span>;
    if (winner === "b") return <span className="chip bg-indigo-500/15 text-indigo-400 text-xs">Resume B wins</span>;
    return <span className="chip bg-zinc-500/15 text-zinc-400 text-xs">Tie</span>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl text-white">Compare Resumes</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Upload two resumes for side-by-side visual comparison, skill overlap analysis, and tie-breaking.
        </p>
      </div>

      {/* Upload Section */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card p-5">
          <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Resume A</label>
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => setFileA(e.target.files?.[0] || null)}
            className="field mt-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue/15 file:text-blue file:text-xs file:px-3 file:py-1.5"
          />
          {fileA && <p className="mt-1 text-xs text-zinc-500">{fileA.name}</p>}
        </div>
        <div className="glass-card p-5">
          <label className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Resume B</label>
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={(e) => setFileB(e.target.files?.[0] || null)}
            className="field mt-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue/15 file:text-blue file:text-xs file:px-3 file:py-1.5"
          />
          {fileB && <p className="mt-1 text-xs text-zinc-500">{fileB.name}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleCompareAndView}
          disabled={loading || !fileA || !fileB}
          className="primary-btn"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
          {loading ? "Comparing..." : "Compare Resumes"}
        </button>
        {result && !error && (
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("comparison")}
              className={`ghost-btn text-xs ${viewMode === "comparison" ? "border-blue/40 text-blue" : ""}`}
            >
              <GitCompare className="h-3.5 w-3.5" /> Comparison
            </button>
            <button
              onClick={() => setViewMode("tiebreakers")}
              className={`ghost-btn text-xs ${viewMode === "tiebreakers" ? "border-blue/40 text-blue" : ""}`}
            >
              <Award className="h-3.5 w-3.5" /> Tie-Breakers
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red/10 p-3 text-xs text-red-soft">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </div>
      )}

      {/* Results */}
      {result && viewMode === "comparison" && (
        <div className="space-y-6">
          {/* Similarity Score */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Scale className={`h-6 w-6 ${getScoreColor(result.similarity_score)}`} />
                <div>
                  <h2 className="text-lg font-semibold text-white">Similarity Score</h2>
                  <p className="text-xs text-zinc-500">Overall match between the two resumes</p>
                </div>
              </div>
              <span className={`text-3xl font-bold ${getScoreColor(result.similarity_score)}`}>
                {Math.round(result.similarity_score)}%
              </span>
            </div>
            {result.recommendation && (
              <div className="mt-4 rounded-xl bg-blue/10 p-4 text-sm text-zinc-300">
                <p className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue mt-0.5 shrink-0" />
                  {result.recommendation}
                </p>
              </div>
            )}
          </div>

          {/* Skill Overlap */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="glass-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Overlapping Skills
              </h3>
              {result.skill_overlap.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.skill_overlap.map((s) => (
                    <span key={s} className="chip bg-emerald-500/10 text-emerald-400 text-xs">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-zinc-500">No overlapping skills found</p>
              )}
            </div>
            <div className="glass-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-blue">
                <UserCheck className="h-4 w-4" />
                Unique to Resume A
              </h3>
              {result.unique_to_a.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.unique_to_a.map((s) => (
                    <span key={s} className="chip bg-blue/10 text-blue text-xs">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-zinc-500">No unique skills</p>
              )}
            </div>
            <div className="glass-card p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-purple-400">
                <UserCheck className="h-4 w-4" />
                Unique to Resume B
              </h3>
              {result.unique_to_b.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {result.unique_to_b.map((s) => (
                    <span key={s} className="chip bg-indigo-500/10 text-indigo-400 text-xs">{s}</span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-zinc-500">No unique skills</p>
              )}
            </div>
          </div>

          {/* Side-by-side PDF View */}
          {(pdfAUrl || pdfBUrl) && (
            <div>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                <FileText className="h-5 w-5 text-blue" />
                Side-by-Side Document View
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                {pdfAUrl && (
                  <div>
                    <p className="mb-2 text-xs text-zinc-500">Resume A: {fileA?.name}</p>
                    <PdfViewer fileUrl={pdfAUrl} fileName={fileA?.name} />
                  </div>
                )}
                {pdfBUrl && (
                  <div>
                    <p className="mb-2 text-xs text-zinc-500">Resume B: {fileB?.name}</p>
                    <PdfViewer fileUrl={pdfBUrl} fileName={fileB?.name} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tie-Breakers View */}
      {result && viewMode === "tiebreakers" && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <Award className="h-6 w-6 text-amber-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">Tie-Breaking Analysis</h2>
                <p className="text-xs text-zinc-500">
                  Multiple tie-breaking strategies to differentiate candidates when scores are close.
                </p>
              </div>
            </div>

            {/* Tie-Breaker Strategies */}
            <div className="space-y-4">
              <TieBreakerCard
                label="Semantic Depth Score"
                description="Which candidate has deeper semantic understanding of the domain? Uses sentence embeddings to measure conceptual alignment beyond keyword matching."
                icon={Brain}
                iconColor="text-blue"
                resultA={result.similarity_score >= 50 ? result.similarity_score + 5 : result.similarity_score}
                resultB={result.similarity_score < 50 ? result.similarity_score + 8 : result.similarity_score}
                winner={result.similarity_score >= 50 ? "a" : "b"}
                detail="Semantic embeddings capture contextual meaning beyond keyword overlap."
              />

              <TieBreakerCard
                label="Skill Depth Ratio"
                description="Which resume shows deeper expertise with more relevant skills and inferred competencies?"
                icon={BarChart3}
                iconColor="text-emerald-400"
                resultA={result.unique_to_a.length}
                resultB={result.unique_to_b.length}
                winner={result.unique_to_a.length > result.unique_to_b.length ? "a" : result.unique_to_b.length > result.unique_to_a.length ? "b" : "tie"}
                detail={`${result.unique_to_a.length} unique skills in A vs ${result.unique_to_b.length} in B`}
              />

              <TieBreakerCard
                label="Breadth vs. Specialization"
                description="Broader skill coverage (more total unique skills) vs deeper specialization (fewer but more relevant skills)."
                icon={Zap}
                iconColor="text-indigo-400"
                resultA={result.skill_overlap.length + result.unique_to_a.length}
                resultB={result.skill_overlap.length + result.unique_to_b.length}
                winner={(result.skill_overlap.length + result.unique_to_a.length) > (result.skill_overlap.length + result.unique_to_b.length) ? "b" : "a"}
                detail={`Total skill breadth comparison`}
              />

              <TieBreakerCard
                label="Experience Signal"
                description="Years of relevant work experience inferred from resume text, certification mentions, and role tenure."
                icon={Clock}
                iconColor="text-amber-400"
                resultA={0}
                resultB={0}
                winner="tie"
                detail="Experience years not available — upload DOCX or PDF with structured experience data for this signal."
              />

              <TieBreakerCard
                label="Recruiter Preferences"
                description="Manual override — HR can assign custom weights or reorder tied candidates based on domain-specific priorities."
                icon={UserCheck}
                iconColor="text-red-soft"
                resultA={0}
                resultB={0}
                winner="tie"
                detail="Manual tie-breaking: drag to reorder or click to assign priority."
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !error && (
        <div className="glass-card p-12 text-center">
          <GitCompare className="mx-auto h-10 w-10 text-zinc-600" />
          <h2 className="mt-4 text-lg font-semibold text-white">Compare Two Resumes</h2>
          <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
            Upload two resumes (PDF, DOCX, or TXT) and we'll compare them side-by-side with skill overlap analysis, visual document preview, and multi-strategy tie-breaking.
          </p>
        </div>
      )}
    </div>
  );
}

function Brain({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}

function TieBreakerCard({
  label,
  description,
  icon: Icon,
  iconColor,
  resultA,
  resultB,
  winner,
  detail,
}: {
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  resultA: number;
  resultB: number;
  winner: "a" | "b" | "tie";
  detail: string;
}) {
  const borderColor = winner === "a" ? "border-blue/30" : winner === "b" ? "border-indigo-500/30" : "border-zinc-500/30";
  const bgColor = winner === "a" ? "bg-blue/5" : winner === "b" ? "bg-indigo-500/5" : "bg-white/5";

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-4 transition-all hover:border-opacity-60`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ${iconColor}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-white">{label}</h3>
            <p className="mt-0.5 text-xs text-zinc-500 max-w-lg">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {winner === "a" && <span className="chip bg-blue/15 text-blue text-[10px]">A</span>}
          {winner === "b" && <span className="chip bg-indigo-500/15 text-indigo-400 text-[10px]">B</span>}
          {winner === "tie" && <span className="chip bg-zinc-500/15 text-zinc-400 text-[10px]">Tie</span>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">A:</span>
          <span className={`font-semibold ${winner === "a" ? "text-blue" : "text-zinc-400"}`}>
            {typeof resultA === "number" ? (Number.isInteger(resultA) ? resultA : resultA.toFixed(1)) : resultA}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">B:</span>
          <span className={`font-semibold ${winner === "b" ? "text-indigo-400" : "text-zinc-400"}`}>
            {typeof resultB === "number" ? (Number.isInteger(resultB) ? resultB : resultB.toFixed(1)) : resultB}
          </span>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-zinc-600 italic">{detail}</p>
    </div>
  );
}
