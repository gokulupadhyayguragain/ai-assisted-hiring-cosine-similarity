"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { GitCompare, Upload, FileText, CheckCircle, XCircle, TrendingUp } from "lucide-react";
export default function ComparePage() {
  const [resumeA, setResumeA] = useState<File | null>(null);
  const [resumeB, setResumeB] = useState<File | null>(null);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const compare = async () => {
    if (!resumeA || !resumeB) return;
    setComparing(true);
    // Simulate comparison
    setTimeout(() => {
      setResult({
        similarity: 72,
        overlap: 8,
        totalA: 12,
        totalB: 14,
        sharedSkills: ["Python", "React", "JavaScript", "SQL", "Git", "Docker", "AWS", "PostgreSQL"],
        onlyA: ["TypeScript", "Next.js", "GraphQL", "Kubernetes"],
        onlyB: ["Java", "Spring Boot", "MongoDB", "Redis", "Kafka", "CI/CD"],
        experienceMatch: "Moderate",
        recommendation: "Both have strong technical foundations. Candidate A has modern frontend skills while Candidate B has backend depth.",
      });
      setComparing(false);
    }, 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Compare Resumes
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Side-by-side comparison with skill overlap analysis.
        </p>
      </div>

      {/* Upload */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { label: "Resume A", file: resumeA, set: setResumeA, color: "blue" },
          { label: "Resume B", file: resumeB, set: setResumeB, color: "red" },
        ].map((r) => (
          <div
            key={r.label}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              r.file
                ? `border-${r.color}/30 bg-${r.color}-light/50`
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            {r.file ? (
              <div className="space-y-3">
                <FileText className={`h-8 w-8 mx-auto text-${r.color}`} />
                <p className="text-sm font-medium text-gray-900">{r.file.name}</p>
                <p className="text-xs text-gray-500">{(r.file.size / 1024).toFixed(1)} KB</p>
                <button onClick={() => r.set(null)} className="text-xs text-red hover:underline">Remove</button>
              </div>
            ) : (
              <label className="cursor-pointer space-y-3">
                <Upload className="h-8 w-8 mx-auto text-gray-300" />
                <p className="text-sm font-medium text-gray-600">
                  Upload {r.label}
                </p>
                <p className="text-xs text-gray-400">PDF, DOCX, or TXT</p>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  className="hidden"
                  onChange={(e) => r.set(e.target.files?.[0] || null)}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={compare}
        disabled={comparing || !resumeA || !resumeB}
        className="primary-btn mx-auto flex"
      >
        {comparing ? "Comparing..." : <><GitCompare className="h-4 w-4" /> Compare Resumes</>}
      </button>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Overview */}
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
            <div className="rounded-xl border border-blue-200 bg-blue-light/50 p-4 text-center">
              <p className="text-2xl font-bold text-blue">{result.similarity}%</p>
              <p className="text-xs text-gray-500">Similarity</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{result.overlap}</p>
              <p className="text-xs text-gray-500">Shared Skills</p>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-center">
              <p className="text-2xl font-bold text-indigo-600">{result.totalA}</p>
              <p className="text-xs text-gray-500">Resume A Skills</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-light p-4 text-center">
              <p className="text-2xl font-bold text-red">{result.totalB}</p>
              <p className="text-xs text-gray-500">Resume B Skills</p>
            </div>
          </div>

          {/* Skills Comparison */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                Shared Skills ({result.overlap})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {result.sharedSkills.map((s: string) => (
                  <span key={s} className="chip bg-emerald-50 text-emerald-700 border border-emerald-200">{s}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <TrendingUp className="h-4 w-4 text-blue" />
                Unique Skills
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-blue font-medium mb-1">Only in Resume A ({result.onlyA.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.onlyA.map((s: string) => (
                      <span key={s} className="chip bg-blue-light text-blue border border-blue/20">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-red font-medium mb-1">Only in Resume B ({result.onlyB.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.onlyB.map((s: string) => (
                      <span key={s} className="chip bg-red-light text-red border border-red/20">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
            <p className="text-xs text-indigo-600 font-semibold mb-1">AI Recommendation</p>
            <p className="text-sm text-indigo-900">{result.recommendation}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
