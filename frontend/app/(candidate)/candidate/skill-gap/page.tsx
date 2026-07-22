"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, CheckCircle, XCircle, TrendingUp, Upload,
  FileText, RefreshCw, Sparkles, BookOpen, Clock,
  ExternalLink,
} from "lucide-react";
import { SkillHeatmap } from "@/components/hr/skill-heatmap";
import { apiFetch, API_BASE, authHeaders } from "@/lib/api";
import { useNotifications } from "@/lib/notifications";

type AnalysisResult = {
  required_skills: string[];
  matched_skills: string[];
  inferred_matched_skills: string[];
  missing_skills: string[];
  extracted_skills: string[];
  required_skill_count: number;
  matched_skill_count: number;
  skill_coverage: number;
  skill_gap_percentage: number;
  suggestions?: string[];
};

type LearningPath = {
  skill: string;
  difficulty: string;
  estimated_hours: number;
  resources: { title: string; url: string; type: string; platform: string }[];
};

type ActionPlan = {
  learning_paths: LearningPath[];
  recommended_timeline: string;
  next_steps: string[];
  score_improvement_estimate: number;
};

export default function SkillGapPage() {
  const toast = useNotifications();
  const [jdText, setJdText] = useState("");
  const [cvText, setCvText] = useState("");
  const [cvFileName, setCvFileName] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [activeTab, setActiveTab] = useState<"skills" | "insights" | "learn">("skills");

  useEffect(() => {
    const savedResumeId = new URLSearchParams(window.location.search).get("resume");
    if (!savedResumeId) return;
    setResumeId(savedResumeId);
    void apiFetch<{ filename: string; text: string }>(`/api/candidate/resumes/${savedResumeId}`, { headers: authHeaders() })
      .then((resume) => { setCvFileName(resume.filename); setCvText(resume.text); })
      .catch((error: any) => toast.add({ type: "error", title: error.message || "Could not load saved resume" }));
  }, [toast]);
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvFileName(file.name);
    if (file.name.endsWith(".txt") || file.name.endsWith(".md")) {
      const reader = new FileReader();
      reader.onload = (ev) => setCvText(ev.target?.result as string || "");
      reader.readAsText(file);
      return;
    }
    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch(`${API_BASE}/api/extract-text`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Extraction failed");
      setCvText(await res.text());
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => setCvText(ev.target?.result as string || "");
      reader.readAsText(file);
    }
  }, []);

  const analyze = async () => {
    if (!jdText.trim() || !cvText.trim()) {
      toast.add({ type: "error", title: "Both CV and Job Description are required" });
      return;
    }
    setLoading(true);
    setResult(null);
    setActionPlan(null);
    try {
      const data = await apiFetch<AnalysisResult>("/api/cv/skill-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ cv_text: cvText, target_text: jdText, resume_id: resumeId, target_label: "Job description" }),
      });
      setResult(data);
      const plan = await apiFetch<ActionPlan>("/api/cv/action-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matched_skills: data.matched_skills,
          missing_skills: data.missing_skills,
          missing_keywords: [],
          mode: "job",
        }),
      });
      setActionPlan(plan);
    } catch (err: any) {
      toast.add({ type: "error", title: err.message || "Analysis failed" });
    } finally {
      setLoading(false);
    }
  };

  const matchScore = result?.skill_coverage ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Skill Gap Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">Upload your CV and a job description to see exactly where you stand.</p>
      </div>

      {/* Input Section */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card space-y-2">
          <h2 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-blue" /> Job Description</h2>
          <textarea className="field h-36 resize-y text-sm" placeholder="Paste the job description..." value={jdText} onChange={(e) => setJdText(e.target.value)} />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card space-y-2">
          <h2 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5"><Upload className="h-3.5 w-3.5 text-blue" /> Your CV</h2>
          {cvFileName ? (
            <div className="rounded-lg bg-blue-light/50 border border-blue/20 p-2 flex items-center gap-2 text-xs">
              <FileText className="h-4 w-4 text-blue" />
              <span className="flex-1 truncate">{cvFileName}</span>
              <button onClick={() => { setCvText(""); setCvFileName(""); }} className="text-red hover:underline">Remove</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-16 rounded-lg border-2 border-dashed border-gray-200 cursor-pointer hover:border-blue/30 transition-all">
              <p className="text-xs text-gray-500">Upload CV (TXT, PDF, DOCX)</p>
              <input type="file" accept=".txt,.pdf,.docx,.md" className="hidden" onChange={handleFileUpload} />
            </label>
          )}
          <textarea className="field h-16 resize-y text-sm" placeholder="Or paste CV text..." value={cvText} onChange={(e) => setCvText(e.target.value)} />
        </div>
      </div>

      <button onClick={analyze} disabled={loading || !jdText.trim() || !cvText.trim()} className="primary-btn w-full sm:w-auto justify-center">
        {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Analyzing...</> : <><Brain className="h-4 w-4" /> Run Skill Gap Analysis</>}
      </button>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Score */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-light text-blue">
                  <Brain className="h-7 w-7" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Required-skill coverage</p>
                  <p className="text-3xl font-bold text-blue">{Math.round(matchScore)}%</p>
                  <p className="text-[11px] text-gray-500">{result.matched_skill_count} of {result.required_skill_count} required skills evidenced</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs text-gray-400">Skill gap</p>
                  <p className="text-lg font-semibold text-red">{Math.round(result.skill_gap_percentage)}%</p>
                  <p className="text-[11px] text-gray-500">higher means more missing skills</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 rounded-xl bg-gray-100 p-1 mt-4 mb-4">
                {(["skills", "insights", "learn"] as const).map((tab) => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                    {tab === "skills" ? "Skills View" : tab === "insights" ? "Insights" : "Quick Learn"}
                  </button>
                ))}
              </div>

              {activeTab === "skills" && (
                <SkillHeatmap
                  matchedSkills={result.matched_skills}
                  missingSkills={result.missing_skills}
                  inferredSkills={result.inferred_matched_skills}
                />
              )}

              {activeTab === "insights" && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" /><span className="text-xs font-semibold text-gray-900">Strengths</span></div>
                    <p className="text-xs text-gray-600 mt-1">You have {result.matched_skills.length} matching required skills: {result.matched_skills.slice(0, 6).join(", ") || "None detected"}.</p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-4">
                    <div className="flex items-center gap-2"><XCircle className="h-4 w-4 text-red" /><span className="text-xs font-semibold text-gray-900">Gaps to Address</span></div>
                    <p className="text-xs text-gray-600 mt-1">{result.missing_skills.length} skills needed: {result.missing_skills.slice(0, 5).join(", ")}.</p>
                  </div>
                  {actionPlan && (
                    <div className="rounded-xl bg-indigo-50 p-4">
                      <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-600" /><span className="text-xs font-semibold text-gray-900">Timeline</span></div>
                      <p className="text-xs text-gray-600 mt-1">{actionPlan.recommended_timeline}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "learn" && actionPlan && (
                <div className="space-y-2">
                  {actionPlan.learning_paths.slice(0, 4).map((lp, i) => (
                    <div key={i} className="rounded-xl bg-gray-50 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-gray-900">{lp.skill}</span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="h-3 w-3" />{lp.estimated_hours}h</span>
                      </div>
                      {lp.resources.slice(0, 2).map((r, ri) => (
                        <a key={ri} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue mt-1">
                          <ExternalLink className="h-3 w-3" /> {r.title}
                        </a>
                      ))}
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 text-center pt-2">Go to <strong>CV Optimizer</strong> for full learning paths &amp; project guides.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
