"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Search,
  Trash2,
  Eye,
  Calendar,
  Building2,
  MapPin,
  Clock,
  Plus,
  Upload,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useNotifications } from "@/lib/notifications";

export default function JdManagerPage() {
  const toast = useNotifications();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [previewJob, setPreviewJob] = useState<any>(null);

  // Add-JD modal state
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addText, setAddText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchJobs = () => {
    setLoading(true);
    fetch(apiUrl("/api/jobs?limit=50"))
      .then((r) => r.json())
      .then((d) => setJobs(Array.isArray(d) ? d : []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(apiUrl("/api/extract-text"), { method: "POST", body: fd });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || "Could not extract text");
      }
      const text = await res.text();
      setAddText(text);
      if (!addTitle.trim()) {
        // derive a title from the filename
        setAddTitle(file.name.replace(/\.[^.]+$/, ""));
      }
      toast.add({ type: "success", title: "Job description extracted from file" });
    } catch (err: any) {
      toast.add({ type: "error", title: err.message || "Failed to read file" });
    } finally {
      setExtracting(false);
    }
  };

  const resetAdd = () => {
    setAddTitle("");
    setAddText("");
  };

  const saveJd = async () => {
    if (!addTitle.trim()) {
      toast.add({ type: "error", title: "Give the job a title" });
      return;
    }
    if (!addText.trim()) {
      toast.add({ type: "error", title: "Paste or upload a job description" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/jobs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: addTitle.trim(),
          description: addText.trim(),
          created_by: "recruiter",
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Request failed: ${res.status}`);
      }
      const saved = await res.json();
      setJobs((prev) => [saved, ...prev]);
      toast.add({ type: "success", title: "Job description saved" });
      setShowAdd(false);
      resetAdd();
    } catch (err: any) {
      toast.add({ type: "error", title: err.message || "Failed to save JD" });
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async (id: string) => {
    try {
      await fetch(apiUrl(`/api/jobs/${id}`), { method: "DELETE" });
      setJobs((prev) => prev.filter((j) => j.job_id !== id));
      toast.add({ type: "success", title: "Job description deleted" });
    } catch {
      toast.add({ type: "error", title: "Failed to delete job" });
    }
  };

  const filtered = jobs.filter(
    (j) =>
      j.title?.toLowerCase().includes(search.toLowerCase()) ||
      j.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            JD Manager
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Browse, search, paste, or upload job descriptions for screening.
          </p>
        </div>
        <button onClick={() => { resetAdd(); setShowAdd(true); }} className="primary-btn">
          <Plus className="h-4 w-4" /> Add JD
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          className="field pl-10"
          placeholder="Search job descriptions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Job List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 border border-gray-200" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((job) => (
            <motion.div
              key={job.job_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card hover:shadow-card-hover transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">
                    {job.title}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                    {job.department && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {job.department}
                      </span>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {job.location}
                      </span>
                    )}
                    {job.experience && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {job.experience}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(job.required_skills ?? []).slice(0, 6).map((s: string) => (
                      <span key={s} className="chip bg-blue-light text-blue text-[10px]">{s}</span>
                    ))}
                    {(job.required_skills ?? []).length > 6 && (
                      <span className="chip bg-gray-100 text-gray-500 text-[10px]">
                        +{job.required_skills.length - 6}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setPreviewJob(job)}
                    className="ghost-btn p-2"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteJob(job.job_id)}
                    className="ghost-btn p-2 hover:!border-red/30 hover:!text-red"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-[10px] text-gray-400">
                <Calendar className="h-3 w-3" />
                {job.created_at
                  ? new Date(job.created_at).toLocaleDateString()
                  : "Unknown date"}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-card">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">
            {search ? "No matching JDs found" : "No job descriptions yet"}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {search
              ? "Try a different search term."
              : "Create your first job posting to see it here."}
          </p>
        </div>
      )}

      {/* Add JD Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-20 bg-black/30 backdrop-blur-sm overflow-y-auto"
            onClick={() => !saving && setShowAdd(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.97 }}
              className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add Job Description</h2>
                <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-600 font-medium">Job Title *</label>
                  <input
                    className="field mt-1"
                    placeholder="Senior Software Engineer"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-600 font-medium">Job Description *</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.md"
                      className="hidden"
                      onChange={(e) => handleFile(e.target.files?.[0])}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={extracting}
                      className="ghost-btn text-xs"
                    >
                      {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      {extracting ? "Extracting..." : "Upload file"}
                    </button>
                  </div>
                  <textarea
                    className="field mt-1 h-56 resize-y"
                    placeholder="Paste the job description here, or upload a PDF/DOCX/TXT file to extract it automatically..."
                    value={addText}
                    onChange={(e) => setAddText(e.target.value)}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Supported uploads: PDF, DOCX, TXT, MD. This JD will be saved as a job you can screen against.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6 justify-end">
                <button onClick={() => setShowAdd(false)} className="ghost-btn text-sm" disabled={saving}>Cancel</button>
                <button onClick={saveJd} className="primary-btn" disabled={saving || extracting}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save JD
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-20 bg-black/30 backdrop-blur-sm overflow-y-auto"
            onClick={() => setPreviewJob(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.97 }}
              className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">{previewJob.title}</h2>
                <button onClick={() => setPreviewJob(null)} className="text-gray-400 hover:text-gray-600"><Eye className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3"><span className="text-xs text-gray-400">Department</span><p className="font-medium text-gray-900 mt-0.5">{previewJob.department || "—"}</p></div>
                  <div className="rounded-lg bg-gray-50 p-3"><span className="text-xs text-gray-400">Experience</span><p className="font-medium text-gray-900 mt-0.5">{previewJob.experience || "—"}</p></div>
                  <div className="rounded-lg bg-gray-50 p-3"><span className="text-xs text-gray-400">Location</span><p className="font-medium text-gray-900 mt-0.5">{previewJob.location || "—"}</p></div>
                  <div className="rounded-lg bg-gray-50 p-3"><span className="text-xs text-gray-400">Salary</span><p className="font-medium text-gray-900 mt-0.5">{previewJob.salary || "—"}</p></div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Required Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(previewJob.required_skills ?? []).map((s: string) => (
                      <span key={s} className="chip bg-blue-light text-blue text-xs">{s}</span>
                    ))}
                    {(!previewJob.required_skills || previewJob.required_skills.length === 0) && (
                      <span className="text-gray-400 text-xs">No skills listed</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-1">Description</p>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {previewJob.description || "No description provided."}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
