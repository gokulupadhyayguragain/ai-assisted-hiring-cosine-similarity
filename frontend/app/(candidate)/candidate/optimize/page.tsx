"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Sparkles, Download, RefreshCw,
  CheckCircle, XCircle, AlertTriangle, ExternalLink,
  Briefcase, GraduationCap, LayoutGrid, Eye, ChevronDown,
  ChevronUp, BookOpen, Hammer, Rocket, Clock, ArrowRight,
} from "lucide-react";
import { apiFetch, API_BASE, authHeaders } from "@/lib/api";
import { useNotifications } from "@/lib/notifications";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("@/components/hr/pdf-viewer").then(m => ({ default: m.PdfViewer })), { ssr: false });

// --- Types ---
type Template = { id: string; name: string; desc: string };
type CvSection = { heading: string; content: string; order: number; suggestions: string[] };
type MissingField = { key: string; label: string; placeholder: string };

type OptimizationResult = {
  session_id: string;
  mode: string;
  ats_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  suggested_skills: string[];
  missing_skills: string[];
  extracted_skills: string[];
  suggestions: string[];
  missing_fields?: MissingField[];
  keyword_density: number;
  template: string;
  comparison_html: string;
  optimized_sections: CvSection[];
  contact?: { full_name?: string; title?: string; email?: string; phone?: string; location?: string; linkedin?: string; website?: string };
  optimization_changes?: string[];
  generation_source?: string;
  matched_skills?: string[];
  skill_coverage?: number;
  skill_gap_percentage?: number;
  optimized_experience?: Array<{ job_title?: string; company?: string; location?: string; start_date?: string; end_date?: string; bullets?: string[] }>;
  optimized_projects?: Array<{ name?: string; technologies?: string; description?: string; bullets?: string[] }>;
};

type Resource = { title: string; url: string; type: string; free: boolean; platform: string };
type LearningPath = { skill: string; difficulty: string; estimated_hours: number; resources: Resource[]; description: string };
type ProjectSuggestion = { title: string; description: string; skills_demonstrated: string[]; difficulty: string; estimated_hours: number; steps: string[]; technologies: string[] };
type ApplicationTip = { category: string; tip: string; priority: string };
type ActionPlan = {
  learning_paths: LearningPath[];
  project_suggestions: ProjectSuggestion[];
  application_tips: ApplicationTip[];
  recommended_timeline: string;
  next_steps: string[];
  score_improvement_estimate: number;
};

const TEMPLATES: Template[] = [
  { id: "professional", name: "Professional", desc: "Polished and versatile — suitable for most jobs" },
  { id: "classic", name: "Classic", desc: "Traditional black — all industries" },
  { id: "europass", name: "Europass", desc: "European standard — EU jobs and scholarships" },
  { id: "modern", name: "Modern", desc: "Blue accents — tech & corporate" },
  { id: "academic", name: "Academic", desc: "Navy, research-focused" },
  { id: "minimal", name: "Minimal", desc: "Simple, max ATS readability" },
  { id: "executive", name: "Executive", desc: "Bold, senior roles" },
];

const TABS = [
  { id: "preview", label: "CV Preview", icon: Eye },
  { id: "score", label: "Analysis", icon: Sparkles },
  { id: "learn", label: "Learn & Build", icon: BookOpen },
  { id: "apply", label: "Next Steps", icon: Rocket },
] as const;
type TabId = (typeof TABS)[number]["id"];

export default function CvOptimizerPage() {
  const toast = useNotifications();
  const [mode, setMode] = useState<"job" | "scholarship">("job");
  const [jdText, setJdText] = useState("");
  const [cvText, setCvText] = useState("");
  const [cvFileName, setCvFileName] = useState("");
  const [cvFileUrl, setCvFileUrl] = useState<string | null>(null); // blob URL for original PDF preview
  const [template, setTemplate] = useState("modern");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [optimizedPdfUrl, setOptimizedPdfUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("preview");
  const [missingInfo, setMissingInfo] = useState<Record<string, string>>({});
  const [expandedProject, setExpandedProject] = useState<number | null>(null);
  const [resumeId, setResumeId] = useState("");
  const [userSuggestions, setUserSuggestions] = useState("");

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

    // Create blob URL for original file preview (PDF only shown inline, DOCX converted)
    if (file.name.endsWith(".pdf")) {
      const url = URL.createObjectURL(file);
      setCvFileUrl(url);
    } else if (file.name.endsWith(".docx")) {
      // Convert DOCX to PDF for preview via /api/convert
      try {
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch(`${API_BASE}/api/convert`, { method: "POST", body: fd });
        if (res.ok) {
          const blob = await res.blob();
          setCvFileUrl(URL.createObjectURL(blob));
        }
      } catch { /* preview not critical */ }
    }

    // Extract text for analysis
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

  const removeFile = () => {
    setCvText("");
    setCvFileName("");
    if (cvFileUrl) { URL.revokeObjectURL(cvFileUrl); setCvFileUrl(null); }
    if (optimizedPdfUrl) { URL.revokeObjectURL(optimizedPdfUrl); setOptimizedPdfUrl(null); }
  };

  const optimize = async () => {
    if (!jdText.trim() || !cvText.trim()) {
      toast.add({ type: "error", title: "Both JD and CV are required" });
      return;
    }
    setLoading(true);
    setResult(null);
    setActionPlan(null);
    if (optimizedPdfUrl) { URL.revokeObjectURL(optimizedPdfUrl); setOptimizedPdfUrl(null); }
    try {
      // Step 1: Analyze the uploaded CV against the job description.
      // The returned report suggestions are applied automatically below.
      const data = await apiFetch<OptimizationResult>("/api/cv/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },          body: JSON.stringify({
          cv_text: cvText,
          target_text: jdText,
          mode,
          template,
          name: "",
          email: "",
          resume_id: resumeId,
          suggestions: userSuggestions.split("\n").map(s => s.trim()).filter(Boolean),
        }),
      });
      setResult(data);
      setActiveTab("preview");

      // Step 2: Generate real formatted PDF for preview
      setGenerating(true);
      const pdfRes = await fetch(`${API_BASE}/api/cv/optimize/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cv_text: cvText,
          target_text: jdText,
          mode,
          template,
          format: "pdf",
          name: "",
          email: "",
          current_skills: data.extracted_skills || [],
          suggestions: userSuggestions.split("\n").map(s => s.trim()).filter(Boolean),
          apply_suggestions: userSuggestions.trim().length > 0,
          missing_info: {},
        }),
      });
      if (pdfRes.ok) {
        const blob = await pdfRes.blob();
        setOptimizedPdfUrl(URL.createObjectURL(blob));
      }
      setGenerating(false);

      // Step 3: Action plan
      const plan = await apiFetch<ActionPlan>("/api/cv/action-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matched_skills: data.matched_skills || data.extracted_skills,
          missing_skills: data.missing_skills,
          missing_keywords: data.missing_keywords,
          mode,
        }),
      });
      setActionPlan(plan);
    } catch (err: any) {
      toast.add({ type: "error", title: err.message || "Optimization failed" });
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const downloadOptimized = async (format: "pdf" | "docx") => {
    try {
      const res = await fetch(`${API_BASE}/api/cv/optimize/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cv_text: cvText,
          target_text: jdText,
          mode,
          template,
          format,
          name: "",
          email: "",
          current_skills: result?.extracted_skills || [],
          suggestions: userSuggestions.split("\n").map(s => s.trim()).filter(Boolean),
          apply_suggestions: userSuggestions.trim().length > 0,
          missing_info: missingInfo,
        }),
      });
      if (!res.ok) throw new Error(`${format.toUpperCase()} generation failed`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Optimized_CV.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.add({ type: "success", title: `${format.toUpperCase()} downloaded!` });
    } catch (err: any) {
      toast.add({ type: "error", title: err.message });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red bg-red-50 border-red-200";
  };

  const getDifficultyColor = (d: string) => {
    if (d === "beginner") return "bg-emerald-100 text-emerald-700";
    if (d === "advanced") return "bg-red-100 text-red-700";
    return "bg-amber-100 text-amber-700";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">CV Optimizer</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload your CV, paste a job description, and get a professionally formatted optimized CV with real templates.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-full w-fit">
        <button onClick={() => setMode("job")} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${mode === "job" ? "bg-white text-blue shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <Briefcase className="h-4 w-4" /> For Jobs
        </button>
        <button onClick={() => setMode("scholarship")} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${mode === "scholarship" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
          <GraduationCap className="h-4 w-4" /> For Scholarships
        </button>
      </div>

      {/* Input Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Job Description */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FileText className="h-4 w-4 text-blue" />
            {mode === "job" ? "Job Description" : "Scholarship Criteria"}
          </h2>
          <textarea
            className="field h-64 resize-y text-sm"
            placeholder={mode === "job" ? "Paste the job description here..." : "Paste the scholarship requirements here..."}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
          />
        </div>

        {/* CV Input */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Upload className="h-4 w-4 text-blue" /> Your CV
          </h2>
          {cvFileName ? (
            <div className="rounded-xl bg-blue-light/50 border border-blue/20 p-3 flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{cvFileName}</p>
                <p className="text-xs text-gray-500">{cvText.length.toLocaleString()} characters extracted</p>
              </div>
              <button onClick={removeFile} className="text-xs text-red hover:underline">Remove</button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-blue/30 hover:bg-blue-light/20 transition-all">
              <Upload className="h-6 w-6 text-gray-300 mb-1" />
              <p className="text-sm font-medium text-gray-600">Upload CV</p>
              <p className="text-xs text-gray-400">PDF, DOCX, TXT, or MD</p>
              <input type="file" accept=".txt,.pdf,.docx,.md" className="hidden" onChange={handleFileUpload} />
            </label>
          )}

          {/* Your Suggestions */}
          <div>
            <label className="text-xs text-gray-600 font-medium">Your Suggestions <span className="text-gray-400 font-normal">(optional — one per line)</span></label>
            <textarea
              className="field mt-1 h-20 resize-y text-sm"
              placeholder="Add your own suggestions or notes for the optimizer..."
              value={userSuggestions}
              onChange={(e) => setUserSuggestions(e.target.value)}
            />
          </div>

          {/* Template Selector */}
          <div>
            <label className="text-xs text-gray-600 font-medium">Output Template</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5 mt-1">
              {TEMPLATES.map((t) => (
                <button key={t.id} onClick={() => setTemplate(t.id)} title={t.desc}
                  className={`text-center rounded-lg border p-2 text-[10px] transition-all ${template === t.id ? "border-blue bg-blue-light/50 text-blue font-medium" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  <LayoutGrid className="h-3 w-3 mx-auto mb-0.5" />
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <button onClick={optimize} disabled={loading || !jdText.trim() || !cvText.trim()} className="primary-btn w-full justify-center">
            {loading ? <><RefreshCw className="h-4 w-4 animate-spin" /> Optimizing...</> : <><Sparkles className="h-4 w-4" /> Optimize &amp; Generate CV</>}
          </button>
        </div>
      </div>

      {/* Original CV Preview (before optimization) */}
      {cvFileUrl && !result && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Your Original CV</h3>
          <PdfViewer fileUrl={cvFileUrl} fileName={cvFileName} />
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Score Banner */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
              <div className="flex items-center gap-6 flex-wrap">
                <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold border-4 ${getScoreColor(result.ats_score)}`}>
                  {Math.round(result.ats_score)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    {result.ats_score >= 80 ? "Excellent Match!" : result.ats_score >= 60 ? "Good — Can Improve" : "Needs Optimization"}
                  </h3>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span className="text-emerald-600 font-medium">{result.matched_keywords.length} keywords matched</span>
                    <span className="text-red font-medium">{result.missing_keywords.length} missing</span>
                    {actionPlan && <span className="text-blue font-medium">+{actionPlan.score_improvement_estimate}% potential</span>}
                  </div>
                </div>
                {/* Download buttons */}
                <div className="flex gap-2">
                  <button onClick={() => downloadOptimized("pdf")} className="primary-btn text-sm">
                    <Download className="h-4 w-4" /> PDF
                  </button>
                  <button onClick={() => downloadOptimized("docx")} className="ghost-btn text-sm border border-gray-200">
                    <Download className="h-4 w-4" /> DOCX
                  </button>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${result.ats_score >= 80 ? "bg-emerald-500" : result.ats_score >= 60 ? "bg-amber-500" : "bg-red"}`} style={{ width: `${result.ats_score}%` }} />
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl overflow-x-auto">
              {TABS.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-white text-blue shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  <tab.icon className="h-4 w-4" /> {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: CV Preview — side by side original vs optimized */}
            {activeTab === "preview" && (
              <div className="space-y-4">
                {generating && (
                  <div className="rounded-2xl border border-blue/20 bg-blue-light/30 p-4 flex items-center gap-3">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue" />
                    <p className="text-sm text-gray-700">Generating your optimized CV with <strong>{TEMPLATES.find(t => t.id === template)?.name}</strong> template...</p>
                  </div>
                )}

                <div className="grid gap-4 lg:grid-cols-2">
                  {/* Original */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Original CV</h4>
                    {cvFileUrl ? (
                      <PdfViewer fileUrl={cvFileUrl} fileName={cvFileName} />
                    ) : (
                      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card max-h-[600px] overflow-y-auto">
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans leading-relaxed">{cvText.slice(0, 3000)}</pre>
                      </div>
                    )}
                  </div>

                  {/* Optimized — Formatted HTML Preview */}
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Optimized CV ({TEMPLATES.find(t => t.id === template)?.name})
                    </h4>
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-card max-h-[700px] overflow-y-auto">
                      <div className="w-full min-w-0 space-y-3 p-4" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: "9.5px", lineHeight: 1.35 }}>
                        {result.contact && (result.contact.full_name || result.contact.email) && (
                          <div className="border-b border-gray-200 pb-4">
                            <h2 className="text-xl font-bold text-gray-900">{result.contact.full_name || "Candidate"}</h2>
                            {result.contact.title && <p className="text-sm text-gray-500 mt-1">{result.contact.title}</p>}
                            <p className="text-[11px] text-gray-500 mt-2">
                              {[result.contact.email, result.contact.phone, result.contact.location, result.contact.linkedin, result.contact.website].filter(Boolean).join("  |  ")}
                            </p>
                          </div>
                        )}
                        {/* Render sections from optimized_sections */}
                        {result.optimized_sections
                          .filter((s) => s.heading.toLowerCase() !== "header" && s.heading.toLowerCase() !== "full cv")
                          .map((section, i) => {
                            const heading = section.heading.toLowerCase();
                            const isExperience = heading === "experience";
                            const isProjects = heading === "projects";
                            const hasStructuredRecords = isExperience
                              ? Boolean(result.optimized_experience?.length)
                              : isProjects
                                ? Boolean(result.optimized_projects?.length)
                                : false;
                            const lines = section.content.split(/\n+/).map((line) => line.trim()).filter(Boolean);

                            return (
                              <section key={i} className="w-full min-w-0">
                                <h3 className="mb-2 w-full border-b border-blue/30 pb-1 text-[12px] font-bold uppercase tracking-wider text-blue">
                                  {section.heading}
                                </h3>

                                {isExperience && hasStructuredRecords ? (
                                  <div className="w-full space-y-3">
                                    {result.optimized_experience?.map((experience, experienceIndex) => {
                                      const dates = [experience.start_date, experience.end_date || (experience.start_date ? "Present" : "")].filter(Boolean).join(" – ");
                                      return (
                                        <article key={`${experience.job_title || "experience"}-${experienceIndex}`} className="w-full border-b border-gray-100 pb-2 last:border-0">
                                          <div className="flex w-full items-start justify-between gap-3">
                                            <p className="min-w-0 flex-1 break-words text-[11px] font-bold leading-[1.35] text-gray-900">
                                              {experience.job_title || "Experience"}
                                              {experience.company && <span className="font-normal text-blue"> — {experience.company}</span>}
                                            </p>
                                            {dates && <p className="max-w-[42%] shrink-0 break-words text-right text-[10px] leading-[1.35] text-gray-500">{dates}</p>}
                                          </div>
                                          {experience.location && <p className="w-full text-[10px] leading-[1.35] text-gray-500">{experience.location}</p>}
                                          <div className="mt-1 w-full space-y-1">
                                            {(experience.bullets || []).map((bullet, bulletIndex) => (
                                              <p key={`${experienceIndex}-bullet-${bulletIndex}`} className="flex w-full min-w-0 items-start gap-2 break-words text-[9.5px] leading-[1.35] text-gray-700">
                                                <span className="shrink-0 text-blue">•</span>
                                                <span className="min-w-0 flex-1 break-words">{bullet}</span>
                                              </p>
                                            ))}
                                          </div>
                                        </article>
                                      );
                                    })}
                                  </div>
                                ) : isProjects && hasStructuredRecords ? (
                                  <div className="w-full space-y-3">
                                    {result.optimized_projects?.map((project, projectIndex) => (
                                      <article key={`${project.name || "project"}-${projectIndex}`} className="w-full border-b border-gray-100 pb-2 last:border-0">
                                        <p className="w-full break-words text-[11px] font-bold leading-[1.35] text-gray-900">
                                          {project.name || "Project"}
                                          {project.technologies && <span className="font-normal italic text-gray-500"> [{project.technologies}]</span>}
                                        </p>
                                        {project.description && <p className="mt-1 w-full break-words text-[9.5px] leading-[1.35] text-gray-600">{project.description}</p>}
                                        <div className="mt-1 w-full space-y-1">
                                          {(project.bullets || []).map((bullet, bulletIndex) => (
                                            <p key={`${projectIndex}-bullet-${bulletIndex}`} className="flex w-full min-w-0 items-start gap-2 break-words text-[9.5px] leading-[1.35] text-gray-700">
                                              <span className="shrink-0 text-blue">•</span>
                                              <span className="min-w-0 flex-1 break-words">{bullet}</span>
                                            </p>
                                          ))}
                                        </div>
                                      </article>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="w-full space-y-1.5 break-words text-[9.5px] leading-[1.35] text-gray-700">
                                    {lines.map((line, li) => {
                                      const isBullet = line.startsWith("•") || line.startsWith("-") || line.startsWith("–");
                                      if (isBullet) {
                                        return (
                                          <p key={li} className="flex w-full min-w-0 items-start gap-2 break-words">
                                            <span className="shrink-0 text-blue">•</span>
                                            <span className="min-w-0 flex-1">{line.replace(/^[•–-]\s*/, "")}</span>
                                          </p>
                                        );
                                      }
                                      if (line.includes(":") && line.split(":")[0].length < 20) {
                                        const [category, ...rest] = line.split(":");
                                        return <p key={li} className="w-full break-words"><strong className="text-gray-900">{category}:</strong> {rest.join(":")}</p>;
                                      }
                                      return <p key={li} className="w-full break-words text-gray-800">{line}</p>;
                                    })}
                                  </div>
                                )}
                              </section>
                            );
                          })}
                        {result.optimized_sections.filter(s => s.heading.toLowerCase() !== "header" && s.heading.toLowerCase() !== "full cv").length === 0 && (
                          <div className="text-center text-gray-400 py-8">
                            <p>No structured content detected.</p>
                            <p className="text-xs mt-1">Try a CV with clear section headings (Experience, Education, Skills).</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {result.missing_fields && result.missing_fields.length > 0 && (
                  <div className="rounded-2xl border border-blue/20 bg-blue-light/30 p-5">
                    <h3 className="text-sm font-semibold text-gray-900">A few details are missing</h3>
                    <p className="mt-1 text-xs text-gray-600">Add only the year when you know it. Months are optional and are not required.</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {result.missing_fields.map((field) => (
                        <label key={field.key} className="text-xs font-medium text-gray-700">
                          {field.label}
                          <input
                            className="field mt-1 text-sm"
                            placeholder={field.placeholder}
                            value={missingInfo[field.key] || ""}
                            onChange={(e) => setMissingInfo((current) => ({ ...current, [field.key]: e.target.value }))}
                            inputMode="numeric"
                          />
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] text-gray-500">These answers are applied to the generated PDF/DOCX. Existing CV facts are never replaced by guesses.</p>
                  </div>
                )}

                {/* Download bar */}
                <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-blue-light/30 to-white p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Download your optimized CV</p>
                    <p className="text-xs text-gray-500">Professionally formatted with {TEMPLATES.find(t => t.id === template)?.name} template — proper headings, bullet points, spacing</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => downloadOptimized("pdf")} className="primary-btn text-sm"><Download className="h-4 w-4" /> PDF</button>
                    <button onClick={() => downloadOptimized("docx")} className="ghost-btn text-sm border border-gray-200"><Download className="h-4 w-4" /> DOCX</button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Analysis */}
            {activeTab === "score" && (
              <div className="space-y-4">
                {userSuggestions.trim() && (
                  <div className="rounded-2xl border border-blue/20 bg-blue-light/30 p-5 shadow-card">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2">
                      <Sparkles className="h-4 w-4 text-blue" /> Your Suggestions Applied
                    </h3>
                    <div className="space-y-1">
                      {userSuggestions.split("\n").map(s => s.trim()).filter(Boolean).map((s, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {result.missing_skills.length > 0 && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                      <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-900 mb-2"><XCircle className="h-4 w-4 text-red" /> Missing Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {result.missing_skills.map((s) => <span key={s} className="rounded-full bg-red-100 text-red border border-red/20 px-2 py-0.5 text-xs">{s}</span>)}
                      </div>
                    </div>
                  )}
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-900 mb-2"><CheckCircle className="h-4 w-4 text-emerald-600" /> Matched</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {result.matched_keywords.slice(0, 15).map((kw) => <span key={kw} className="rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs">{kw}</span>)}
                    </div>
                  </div>
                </div>
                {result.missing_keywords.length > 0 && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-900 mb-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> Missing Keywords ({result.missing_keywords.length})</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {result.missing_keywords.slice(0, 20).map((kw) => <span key={kw} className="rounded-full bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 text-xs">{kw}</span>)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Learn & Build */}
            {activeTab === "learn" && actionPlan && (
              <div className="space-y-4">
                {/* Learning Paths */}
                <div className="rounded-2xl border border-blue/10 bg-blue-light/30 p-4">
                  <p className="text-sm text-gray-700"><strong>{actionPlan.learning_paths.length} skills to learn.</strong> Resources below are free and beginner-friendly.</p>
                </div>
                {actionPlan.learning_paths.map((lp, i) => (
                  <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-light text-blue text-xs font-bold">{i + 1}</span>
                        <h4 className="text-sm font-semibold text-gray-900">{lp.skill}</h4>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getDifficultyColor(lp.difficulty)}`}>{lp.difficulty}</span>
                      </div>
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="h-3 w-3" />{lp.estimated_hours}h</span>
                    </div>
                    <div className="space-y-1">
                      {lp.resources.map((r, ri) => (
                        <a key={ri} href={r.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg bg-gray-50 hover:bg-blue-light/30 p-2 transition-colors group">
                          <span className="text-[10px] text-gray-400 uppercase font-medium w-10">{r.type}</span>
                          <span className="flex-1 text-xs text-gray-700 group-hover:text-blue">{r.title}</span>
                          <ExternalLink className="h-3 w-3 text-gray-300 group-hover:text-blue" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Projects */}
                {actionPlan.project_suggestions.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-900 pt-2 flex items-center gap-2"><Hammer className="h-4 w-4 text-amber-600" /> Projects to Build</h3>
                    {actionPlan.project_suggestions.map((proj, i) => (
                      <div key={i} className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
                        <button onClick={() => setExpandedProject(expandedProject === i ? null : i)} className="w-full p-4 text-left hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-gray-900">{proj.title}</h4>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${getDifficultyColor(proj.difficulty)}`}>{proj.difficulty}</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{proj.description}</p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                              <span className="text-xs text-gray-400">{proj.estimated_hours}h</span>
                              {expandedProject === i ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                            </div>
                          </div>
                        </button>
                        <AnimatePresence>
                          {expandedProject === i && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-gray-100">
                              <div className="p-4 space-y-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase">Step-by-Step</p>
                                {proj.steps.map((step, si) => (
                                  <div key={si} className="flex items-start gap-2">
                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-light text-blue text-[10px] font-bold">{si + 1}</span>
                                    <p className="text-xs text-gray-700">{step}</p>
                                  </div>
                                ))}
                                <div className="flex flex-wrap gap-1 pt-2">
                                  {proj.technologies.map((t) => <span key={t} className="rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-[10px]">{t}</span>)}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
            {activeTab === "learn" && !actionPlan && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">Loading recommendations...</div>
            )}

            {/* Tab: Next Steps */}
            {activeTab === "apply" && actionPlan && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-blue/10 bg-gradient-to-r from-blue-light/40 to-white p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"><Rocket className="h-4 w-4 text-blue" /> Your Action Plan</h3>
                  <div className="space-y-2">
                    {actionPlan.next_steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue text-white text-xs font-bold">{i + 1}</span>
                        <p className="text-sm text-gray-700 pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 rounded-xl bg-white border border-gray-100">
                    <p className="text-xs text-gray-500"><strong>Timeline:</strong> {actionPlan.recommended_timeline}</p>
                  </div>
                </div>
                {["resume", "cover_letter", "interview", "portfolio", "networking"].map((cat) => {
                  const tips = actionPlan.application_tips.filter((t) => t.category === cat);
                  if (tips.length === 0) return null;
                  const labels: Record<string, string> = { resume: "Resume Tips", cover_letter: "Cover Letter", interview: "Interview Prep", portfolio: "Portfolio", networking: "Networking" };
                  return (
                    <div key={cat} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
                      <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">{labels[cat]}</h4>
                      <div className="space-y-1.5">
                        {tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <ArrowRight className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${tip.priority === "high" ? "text-blue" : "text-gray-400"}`} />
                            <p className={`text-xs ${tip.priority === "high" ? "text-gray-900" : "text-gray-600"}`}>{tip.tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
