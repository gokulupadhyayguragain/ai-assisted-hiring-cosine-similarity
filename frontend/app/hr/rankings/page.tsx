"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award, Download, Filter, Search, ChevronDown, ChevronUp,
  Brain, BarChart3, TrendingUp, FileText, X,
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { TieBreakSummary } from "@/components/hr/tie-break-summary";
import { SkillHeatmap } from "@/components/hr/skill-heatmap";

export default function RankingsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [viewCv, setViewCv] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(apiUrl("/api/sessions?limit=20"))
      .then((r) => r.json())
      .then((d) => {
        const sess = d.sessions ?? [];
        setSessions(sess);
        if (sess.length > 0) setSelectedSession(sess[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const candidates = (selectedSession?.candidates ?? [])
    .filter((c: any) => (c.score ?? 0) >= minScore)
    .filter((c: any) =>
      !search || c.candidate_id?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));

  const exportCsv = () => {
    if (!selectedSession) return;
    window.open(apiUrl(`/api/sessions/${selectedSession.session_id}/export.csv`), "_blank");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Candidate Rankings</h1>
          <p className="mt-1 text-sm text-gray-500">View ranked candidates from screening sessions.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="ghost-btn text-sm" disabled={!selectedSession}>
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Session Selector */}
      {sessions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sessions.map((s: any) => (
            <button
              key={s.session_id}
              onClick={() => setSelectedSession(s)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                selectedSession?.session_id === s.session_id
                  ? "bg-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s.session_id?.slice(0, 8)}… ({s.candidates?.length ?? 0})
            </button>
          ))}
        </div>
      )}

      {selectedSession && (
        <>
          {/* Session Info */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {[
              { label: "Total Candidates", value: candidates.length, icon: Brain, color: "text-blue" },
              { label: "Avg Match Score", value: candidates.length ? `${(candidates.reduce((a: number, c: any) => a + (c.score ?? 0), 0) / candidates.length).toFixed(1)}%` : "—", icon: BarChart3, color: "text-emerald-600" },
              { label: "Role", value: selectedSession.role, icon: TrendingUp, color: "text-indigo-600" },
              { label: "Processing", value: `${(selectedSession.processing_ms / 1000).toFixed(1)}s`, icon: Award, color: "text-amber-600" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-center gap-2">
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                  <span className="text-xs text-gray-500">{s.label}</span>
                </div>
                <p className="mt-1 text-lg font-semibold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="field pl-9 text-sm" placeholder="Search candidate..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <input type="range" min={0} max={100} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-24 accent-blue" />
              <span className="text-xs text-gray-500 min-w-[3rem]">{minScore}%+</span>
            </div>
          </div>

          {/* Tie-Breaking */}
          {candidates.length >= 2 && (
            <TieBreakSummary candidates={candidates} threshold={5} />
          )}

          {/* Rankings */}
          {candidates.length > 0 ? (
            <div className="space-y-3">
              {candidates.map((candidate: any, idx: number) => (
                <motion.div
                  key={candidate.candidate_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedCandidate(expandedCandidate === candidate.candidate_id ? null : candidate.candidate_id)}
                    className="w-full text-left p-4 sm:p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue to-red text-white text-lg font-bold shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{candidate.display_name || candidate.source_filename}</p>
                        <p className="text-xs text-gray-500">{candidate.candidate_id} &middot; {candidate.experience_years ? `${candidate.experience_years}y exp` : "Exp N/A"}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-blue">{Math.round(candidate.score ?? 0)}%</p>
                          <p className="text-[10px] text-gray-400">Match</p>
                        </div>
                        <div className="hidden sm:flex gap-2">
                          <div className="rounded-lg bg-blue-light/50 px-2.5 py-1.5 text-center min-w-[3rem]">
                            <p className="text-xs font-semibold text-blue">{Math.round(candidate.tfidf_score ?? 0)}%</p>
                            <p className="text-[8px] text-gray-500">TF-IDF</p>
                          </div>
                          <div className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-center min-w-[3rem]">
                            <p className="text-xs font-semibold text-indigo-600">{Math.round(candidate.semantic_score ?? 0)}%</p>
                            <p className="text-[8px] text-gray-500">Semantic</p>
                          </div>
                        </div>
                        {expandedCandidate === candidate.candidate_id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedCandidate === candidate.candidate_id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-gray-100"
                      >
                        <div className="p-4 sm:p-5 space-y-4">
                          <SkillHeatmap
                            matchedSkills={candidate.matched_skills ?? []}
                            missingSkills={candidate.missing_skills ?? []}
                            inferredSkills={candidate.inferred_skills ?? []}
                          />

                          {candidate.summary && (
                            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                              <p className="text-xs text-gray-500 font-medium mb-1">AI Summary</p>
                              <p className="text-sm text-gray-700">{candidate.summary}</p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {candidate.resume_text && (
                              <button
                                onClick={() => setViewCv(candidate)}
                                className="ghost-btn text-xs"
                              >
                                <FileText className="h-3.5 w-3.5" /> View CV
                              </button>
                            )}
                            <a
                              href={apiUrl(`/api/sessions/${selectedSession.session_id}/candidates/${candidate.candidate_id}/report.pdf`)}
                              target="_blank"
                              className="ghost-btn text-xs"
                            >
                              <Download className="h-3.5 w-3.5" /> Transparency Report
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-card">
              <Award className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900">No candidates match your filters</h3>
              <p className="text-sm text-gray-500 mt-1">Try lowering the minimum score threshold.</p>
            </div>
          )}
        </>
      )}

      {!loading && sessions.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-card">
          <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">No screening sessions yet</h3>
          <p className="text-sm text-gray-500 mt-1">Run your first AI screening to see rankings here.</p>
        </div>
      )}

      {/* CV Viewer Modal */}
      <AnimatePresence>
        {viewCv && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-20 bg-black/30 backdrop-blur-sm overflow-y-auto"
            onClick={() => setViewCv(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.97 }}
              className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-100 p-5">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue shrink-0" />
                    {viewCv.display_name || viewCv.source_filename}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {viewCv.source_filename} &middot; {viewCv.candidate_id} &middot; {Math.round(viewCv.score ?? 0)}% match
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <a
                    href={apiUrl(`/api/sessions/${selectedSession.session_id}/candidates/${viewCv.candidate_id}/cv.pdf`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ghost-btn text-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Open PDF
                  </a>
                  <button onClick={() => setViewCv(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="h-[72vh] bg-gray-100">
                <iframe
                  title={`${viewCv.candidate_id} CV`}
                  src={apiUrl(`/api/sessions/${selectedSession.session_id}/candidates/${viewCv.candidate_id}/cv.pdf`)}
                  className="h-full w-full rounded-b-2xl"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
