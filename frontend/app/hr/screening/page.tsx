"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  ShieldCheck,
  BarChart3,
  Brain,
  GitCompare,
  Award,
  FileSearch,
  CheckCircle,
  Loader2,
  Briefcase,
  X,
  Play,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";
import { useNotifications } from "@/lib/notifications";

type Job = {
  job_id: string;
  title: string;
  department: string;
  location: string;
  experience: string;
  required_skills: string[];
  description: string;
};

const STEPS = [
  { id: "upload", icon: Upload, label: "Uploading Resumes" },
  { id: "extract", icon: FileText, label: "Extracting Text" },
  { id: "anonymize", icon: ShieldCheck, label: "Anonymizing Data" },
  { id: "tfidf", icon: BarChart3, label: "TF-IDF Analysis" },
  { id: "bert", icon: Brain, label: "BERT Embedding" },
  { id: "cosine", icon: GitCompare, label: "Cosine Similarity" },
  { id: "rank", icon: Award, label: "Ranking Candidates" },
  { id: "report", icon: FileSearch, label: "Generating Reports" },
];

type Phase = "configure" | "running" | "complete";

export default function ScreeningPage() {
  const router = useRouter();
  const toast = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("configure");

  // Configure state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [pastedJd, setPastedJd] = useState("");
  const [usePaste, setUsePaste] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // Running state
  const [progress, setProgress] = useState(0);
  const [requestDone, setRequestDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Load saved jobs
  useEffect(() => {
    fetch(apiUrl("/api/jobs?limit=100"))
      .then((r) => r.json())
      .then((d) => setJobs(Array.isArray(d) ? d : []))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false));
  }, []);

  const selectedJob = jobs.find((j) => j.job_id === selectedJobId) || null;

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = Array.from(incoming);
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...next.filter((f) => !seen.has(f.name + f.size))];
    });
  };

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx));

  const buildJobText = (): string => {
    if (usePaste) return pastedJd.trim();
    if (!selectedJob) return "";
    const parts = [selectedJob.title];
    if (selectedJob.required_skills?.length) {
      parts.push(`Required skills: ${selectedJob.required_skills.join(", ")}`);
    }
    if (selectedJob.description) parts.push(selectedJob.description);
    return parts.join("\n\n").trim();
  };

  const canRun =
    files.length > 0 && (usePaste ? pastedJd.trim().length > 0 : !!selectedJobId);

  // Progress animation while the request is in flight.
  useEffect(() => {
    if (phase !== "running") return;
    const interval = setInterval(() => {
      setProgress((p) => {
        // Climb toward 90% while waiting; jump to 100% once the request resolves.
        if (requestDone) return Math.min(p + 6, 100);
        if (p >= 90) return 90;
        return Math.min(p + Math.random() * 4 + 1, 90);
      });
    }, 250);
    return () => clearInterval(interval);
  }, [phase, requestDone]);

  // When progress hits 100 after the request is done, move to complete.
  useEffect(() => {
    if (phase === "running" && requestDone && progress >= 100) {
      setPhase("complete");
    }
  }, [phase, requestDone, progress]);

  const currentStep = Math.min(
    Math.floor((progress / 100) * STEPS.length),
    STEPS.length - 1,
  );

  const runScreening = useCallback(async () => {
    const jobText = buildJobText();
    if (!jobText) {
      toast.add({ type: "error", title: "Select a job or paste a job description" });
      return;
    }
    if (files.length === 0) {
      toast.add({ type: "error", title: "Upload at least one candidate CV" });
      return;
    }

    // Reset running state and switch phase.
    setProgress(0);
    setRequestDone(false);
    setErrorMsg(null);
    setSessionId(null);
    setPhase("running");

    const fd = new FormData();
    files.forEach((f) => fd.append("resumes", f));
    fd.append("job_text", jobText);
    fd.append("role", "recruiter");
    fd.append("tfidf_weight", "0.65");

    try {
      const res = await fetch(apiUrl("/api/analyze"), { method: "POST", body: fd });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Screening failed: ${res.status}`);
      }
      const data = await res.json();
      setSessionId(data.session_id ?? null);
      setRequestDone(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Screening failed");
      setRequestDone(true);
      setProgress(100);
    }
  }, [files, usePaste, pastedJd, selectedJob, toast]);

  // ---- CONFIGURE PHASE ----
  if (phase === "configure") {
    return (
      <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Run Screening</h1>
          <p className="mt-1 text-sm text-gray-500">
            Select a job, add candidate CVs, then run the AI screening pipeline.
          </p>
        </div>

        {/* Step 1: Job */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue text-white text-xs">1</span>
              Choose a job description
            </h2>
            <button
              onClick={() => setUsePaste((v) => !v)}
              className="text-xs text-blue hover:underline"
            >
              {usePaste ? "Pick a saved job" : "Paste a JD instead"}
            </button>
          </div>

          {usePaste ? (
            <textarea
              className="field h-40 resize-y"
              placeholder="Paste the full job description here..."
              value={pastedJd}
              onChange={(e) => setPastedJd(e.target.value)}
            />
          ) : jobsLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100 border border-gray-200" />
              ))}
            </div>
          ) : jobs.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 max-h-72 overflow-y-auto pr-1">
              {jobs.map((job) => (
                <button
                  key={job.job_id}
                  onClick={() => setSelectedJobId(job.job_id)}
                  className={`text-left rounded-xl border p-3 transition-all ${
                    selectedJobId === job.job_id
                      ? "border-blue bg-blue-light shadow-sm"
                      : "border-gray-200 bg-white hover:border-blue/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue shrink-0" />
                    <span className="text-sm font-semibold text-gray-900 truncate">{job.title}</span>
                    {selectedJobId === job.job_id && <CheckCircle className="h-4 w-4 text-blue ml-auto shrink-0" />}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1 truncate">
                    {[job.department, job.location].filter(Boolean).join(" · ") || "No details"}
                  </p>
                  {job.required_skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {job.required_skills.slice(0, 4).map((s) => (
                        <span key={s} className="chip bg-white text-blue text-[9px] border border-blue/20">{s}</span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
              <p className="text-sm text-gray-500">
                No saved jobs yet. Create one in{" "}
                <a href="/hr/jobs" className="text-blue hover:underline">Job Postings</a>{" "}
                or paste a JD above.
              </p>
            </div>
          )}
        </div>

        {/* Step 2: CVs */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue text-white text-xs">2</span>
            Upload candidate CVs
          </h2>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
            className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue/50 transition-colors"
          >
            <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Click to browse or drag & drop CVs here</p>
            <p className="text-[11px] text-gray-400 mt-1">PDF, DOCX, TXT, MD — multiple files supported</p>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f, idx) => (
                <div key={f.name + idx} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <FileText className="h-4 w-4 text-blue shrink-0" />
                  <span className="text-sm text-gray-700 truncate flex-1">{f.name}</span>
                  <span className="text-[10px] text-gray-400">{(f.size / 1024).toFixed(0)} KB</span>
                  <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Run */}
        <div className="flex justify-end">
          <Button onClick={runScreening} disabled={!canRun}>
            <Play className="h-4 w-4" /> Run Screening ({files.length} CV{files.length === 1 ? "" : "s"})
          </Button>
        </div>
      </div>
    );
  }

  // ---- RUNNING / COMPLETE PHASE ----
  const complete = phase === "complete";
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-2xl mx-auto text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {errorMsg ? "Screening Failed" : complete ? "Screening Complete" : "AI Screening in Progress"}
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          {errorMsg
            ? errorMsg
            : complete
            ? "Screening complete! Ready to view results."
            : "Processing resumes through the AI pipeline..."}
        </p>

        {errorMsg ? (
          <div className="rounded-2xl border border-red/20 bg-red/5 p-8 shadow-card">
            <AlertCircle className="h-10 w-10 text-red mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-5">{errorMsg}</p>
            <Button variant="outline" onClick={() => setPhase("configure")}>
              Back to setup
            </Button>
          </div>
        ) : (
          <>
            {/* Progress Ring */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e4e4e7" strokeWidth="8" />
                <motion.circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke="url(#progressGradient)" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(progress / 100) * 327} 327`}
                  animate={{ strokeDasharray: `${(progress / 100) * 327} 327` }}
                  transition={{ duration: 0.3 }}
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#003893" />
                    <stop offset="100%" stopColor="#CE1126" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-900">{Math.round(progress)}%</span>
              </div>
            </div>

            {/* Pipeline Steps */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-card">
              <div className="grid gap-2 sm:grid-cols-2">
                {STEPS.map((step, i) => {
                  const active = i === currentStep && !complete;
                  const done = i < currentStep || complete;
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0, scale: active ? 1.02 : 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center gap-3 rounded-xl p-3 transition-all duration-300 ${
                        done
                          ? "bg-emerald-50 border border-emerald-200"
                          : active
                          ? "bg-blue-light border border-blue/20 shadow-sm"
                          : "bg-gray-50 border border-gray-100"
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        done ? "bg-emerald-500 text-white" : active ? "bg-blue text-white" : "bg-gray-200 text-gray-400"
                      }`}>
                        {done ? <CheckCircle className="h-4 w-4" /> : active ? <Loader2 className="h-4 w-4 animate-spin" /> : <step.icon className="h-4 w-4" />}
                      </span>
                      <span className={`text-sm font-medium ${
                        done ? "text-emerald-700" : active ? "text-blue" : "text-gray-500"
                      }`}>
                        {step.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Complete Actions */}
            <AnimatePresence>
              {complete && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex flex-wrap justify-center gap-3"
                >
                  <Button onClick={() => router.push("/hr/rankings")}>
                    View Rankings <Award className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => router.push("/hr/analytics")}>
                    View Analytics <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => { setPhase("configure"); setFiles([]); }}>
                    Run Another
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Background Neural Lines */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="neural" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="2" fill="#003893" />
              <line x1="30" y1="30" x2="60" y2="0" stroke="#003893" strokeWidth="0.5" opacity="0.3" />
              <line x1="30" y1="30" x2="0" y2="60" stroke="#CE1126" strokeWidth="0.5" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#neural)" />
        </svg>
      </div>
    </div>
  );
}
