"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle, Brain, Trash2, Clock, BarChart3, Sparkles } from "lucide-react";
import { apiFetch, API_BASE, authHeaders } from "@/lib/api";
import { useNotifications } from "@/lib/notifications";

type ResumeRecord = {
  resume_id: string;
  filename: string;
  file_type: string;
  created_at: string;
  updated_at: string;
  analyses?: Array<{
    analysis_type?: string;
    target_label?: string;
    created_at?: string;
    skill_coverage?: number;
    skill_gap_percentage?: number;
    matched_skill_count?: number;
    required_skill_count?: number;
  }>;
};

export default function CandidateUploadPage() {
  const toast = useNotifications();
  const [uploading, setUploading] = useState(false);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadResumes = useCallback(async () => {
    try {
      const data = await apiFetch<{ resumes: ResumeRecord[] }>("/api/candidate/resumes", {
        headers: authHeaders(),
      });
      setResumes(data.resumes || []);
    } catch (error: any) {
      toast.add({ type: "error", title: error.message || "Could not load your resumes" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void loadResumes(); }, [loadResumes]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(`${API_BASE}/api/candidate/resumes`, {
        method: "POST",
        headers: authHeaders(),
        body: form,
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(detail.detail || "Upload failed");
      }
      await loadResumes();
      toast.add({ type: "success", title: "Resume saved to My Resume" });
    } catch (error: any) {
      toast.add({ type: "error", title: error.message || "Resume upload failed" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeResume = async (resumeId: string) => {
    try {
      await apiFetch(`/api/candidate/resumes/${resumeId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      setResumes((current) => current.filter((resume) => resume.resume_id !== resumeId));
      toast.add({ type: "success", title: "Resume removed" });
    } catch (error: any) {
      toast.add({ type: "error", title: error.message || "Could not remove resume" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Resume</h1>
        <p className="mt-1 text-sm text-gray-500">Keep resumes here for later analysis. Every skill-gap report stays with the resume that was analyzed.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center shadow-card">
        <Upload className={`h-10 w-10 mx-auto ${uploading ? "text-blue animate-bounce" : "text-gray-300"}`} />
        <p className="text-base font-semibold text-gray-700 mt-3">{uploading ? "Saving your resume..." : "Add a resume to your library"}</p>
        <p className="text-sm text-gray-400 mt-1">PDF, DOCX, TXT, or MD — extracted securely for your account</p>
        <label className={`inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 hover:border-blue/30 hover:text-blue transition-all mt-4 ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}>
          <Upload className="h-4 w-4" /> Choose File
          <input type="file" accept=".pdf,.docx,.txt,.md" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </motion.div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Saved resumes and analysis history</h2>
        {!loading && <span className="text-xs text-gray-400">{resumes.length} saved</span>}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">Loading your resume library...</div>
      ) : resumes.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-card">
          <FileText className="h-8 w-8 mx-auto text-gray-300" />
          <p className="text-sm font-medium text-gray-700 mt-2">No resumes saved yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload one above, then use Skill Gap or CV Optimizer whenever you are ready.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <div key={resume.resume_id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-light text-blue"><FileText className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{resume.filename}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Saved {new Date(resume.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/candidate/skill-gap?resume=${resume.resume_id}`} className="ghost-btn text-xs border border-gray-200"><BarChart3 className="h-3.5 w-3.5" /> Analyze</Link>
                  <Link href={`/candidate/optimize?resume=${resume.resume_id}`} className="ghost-btn text-xs border border-gray-200"><Sparkles className="h-3.5 w-3.5" /> Optimize</Link>
                  <button onClick={() => removeResume(resume.resume_id)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red" aria-label={`Delete ${resume.filename}`}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {resume.analyses && resume.analyses.length > 0 ? (
                <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Reports</p>
                  {resume.analyses.slice(0, 5).map((analysis, index) => (
                    <div key={`${resume.resume_id}-${index}`} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      <span className="flex-1 text-gray-600">{analysis.target_label || "Skill-gap analysis"}</span>
                      <span className="font-semibold text-emerald-600">{Math.round(analysis.skill_coverage || 0)}% covered</span>
                      <span className="text-red">{Math.round(analysis.skill_gap_percentage || 0)}% gap</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400"><CheckCircle className="h-3.5 w-3.5" /> Saved and ready for its first analysis</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {[{ icon: FileText, label: "PDF Support", desc: "Selectable text PDFs" }, { icon: FileText, label: "DOCX Support", desc: "Word documents" }, { icon: Brain, label: "Private history", desc: "Only your reports" }].map((item) => (
          <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-3.5 text-center shadow-card">
            <item.icon className="h-5 w-5 mx-auto text-blue" />
            <p className="text-xs font-semibold text-gray-900 mt-1">{item.label}</p>
            <p className="text-[10px] text-gray-500">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
