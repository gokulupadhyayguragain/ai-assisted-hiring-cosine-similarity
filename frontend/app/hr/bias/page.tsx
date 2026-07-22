"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, AlertTriangle, AlertCircle, Info, Sparkles,
  FileText, RefreshCw, CheckCircle, XCircle,
} from "lucide-react";
import { useNotifications } from "@/lib/notifications";

const MOCK_FINDINGS = [
  { term: "strong", category: "Gender Bias", severity: "medium" as const, suggestion: "Replace with 'skilled' or 'capable'" },
  { term: "aggressive", category: "Exclusionary", severity: "high" as const, suggestion: "Replace with 'driven' or 'motivated'" },
  { term: "young", category: "Age Bias", severity: "high" as const, suggestion: "Remove age-related language" },
  { term: "he/his", category: "Gender Bias", severity: "medium" as const, suggestion: "Use 'they/their' or restructure sentence" },
  { term: "man hours", category: "Gender Bias", severity: "low" as const, suggestion: "Replace with 'person-hours' or 'effort'" },
  { term: "rockstar", category: "Exclusionary", severity: "medium" as const, suggestion: "Replace with 'exceptional' or 'top'"},
];

export default function BiasAuditPage() {
  const toast = useNotifications();
  const [jdText, setJdText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<typeof MOCK_FINDINGS | null>(null);
  const [showRewrite, setShowRewrite] = useState(false);

  const analyze = () => {
    if (!jdText.trim()) return;
    setAnalyzing(true);
    setResults(null);
    setTimeout(() => {
      setResults(MOCK_FINDINGS);
      setAnalyzing(false);
    }, 1500);
  };

  const severityColors = {
    high: { bg: "bg-red-50", border: "border-red-200", text: "text-red", icon: AlertCircle },
    medium: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600", icon: AlertTriangle },
    low: { bg: "bg-blue-light", border: "border-blue/20", text: "text-blue", icon: Info },
  };

  const biasScore = results
    ? Math.max(0, 100 - results.reduce((s, f) => s + (f.severity === "high" ? 15 : f.severity === "medium" ? 8 : 3), 0))
    : 100;

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Bias Audit
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Analyze job descriptions for biased or exclusionary language.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <FileText className="h-5 w-5 text-blue" />
            Job Description
          </h2>
          <textarea
            className="field h-64 resize-y text-sm"
            placeholder="Paste your job description here to analyze for bias..."
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
          <button
            onClick={analyze}
            disabled={analyzing || !jdText.trim()}
            className="primary-btn w-full justify-center"
          >
            {analyzing ? (
              <><RefreshCw className="h-4 w-4 animate-spin" /> Analyzing...</>
            ) : (
              <><ShieldCheck className="h-4 w-4" /> Run Bias Audit</>
            )}
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Score */}
          {results && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card"
            >
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Audit Results</h2>
              <div className="flex items-center gap-4">
                <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ${
                  biasScore >= 80 ? "bg-emerald-50 text-emerald-600" :
                  biasScore >= 60 ? "bg-amber-50 text-amber-600" :
                  "bg-red-50 text-red"
                }`}>
                  {biasScore}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Inclusiveness Score</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {biasScore >= 80 ? "This JD appears inclusive." :
                     biasScore >= 60 ? "Some biased language detected." :
                     "Significant bias detected — rewrite recommended."}
                  </p>
                  <button
                    onClick={() => setShowRewrite(true)}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-blue hover:underline"
                  >
                    <Sparkles className="h-3 w-3" /> AI Rewrite Suggestions
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Findings */}
          {results && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Findings ({results.length})
              </h3>
              {results.map((f, i) => {
                const c = severityColors[f.severity];
                const Icon = c.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className={`rounded-xl border ${c.border} ${c.bg} p-3`}
                  >
                    <div className="flex items-start gap-2.5">
                      <Icon className={`h-4 w-4 ${c.text} mt-0.5 shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            &ldquo;{f.term}&rdquo;
                          </span>
                          <span className={`chip text-[9px] ${
                            f.severity === "high" ? "bg-red-100 text-red" :
                            f.severity === "medium" ? "bg-amber-100 text-amber-700" :
                            "bg-blue-light text-blue"
                          }`}>{f.severity}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{f.category}</p>
                        <p className="text-xs text-gray-600 mt-1">{f.suggestion}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!results && !analyzing && (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-card h-full flex flex-col items-center justify-center">
              <ShieldCheck className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">No audit yet</h3>
              <p className="text-sm text-gray-500 mt-1">Paste a job description and click &ldquo;Run Bias Audit&rdquo;.</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Rewrite Modal */}
      <AnimatePresence>
        {showRewrite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            onClick={() => setShowRewrite(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" /> AI Rewrite Suggestions
              </h3>
              <div className="mt-4 space-y-3">
                {[
                  { from: "We need a strong, aggressive leader", to: "We need a skilled, motivated leader" },
                  { from: "Young and dynamic team", to: "Dynamic and innovative team" },
                  { from: "He will manage the department", to: "They will manage the department" },
                  { from: "Man hours required", to: "Person-hours required" },
                  { from: "Looking for a rockstar developer", to: "Looking for an exceptional developer" },
                ].map((item, i) => (
                  <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 line-through">{item.from}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 mt-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-700 font-medium">{item.to}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowRewrite(false)} className="primary-btn w-full mt-4 justify-center">Done</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
