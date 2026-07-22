"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Briefcase, Save, Trash2, Sparkles, Edit3, Loader2 } from "lucide-react";
import { useNotifications } from "@/lib/notifications";
import { apiUrl } from "@/lib/api";

interface JobPosting {
  job_id: string;
  title: string;
  department: string;
  experience: string;
  location: string;
  salary: string;
  required_skills: string[];
  description: string;
  created_at: string;
  updated_at: string;
}

export default function JobsPage() {
  const toast = useNotifications();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    department: "",
    experience: "",
    location: "",
    salary: "",
    skillInput: "",
    skills: [] as string[],
    description: "",
  });

  const fetchJobs = useCallback(() => {
    setLoading(true);
    fetch(apiUrl("/api/jobs?limit=100"))
      .then((r) => r.json())
      .then((d) => setJobs(Array.isArray(d) ? d : []))
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const addSkill = () => {
    const s = form.skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm((f) => ({ ...f, skills: [...f.skills, s], skillInput: "" }));
    }
  };

  const removeSkill = (skill: string) =>
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));

  const resetForm = () =>
    setForm({
      title: "",
      department: "",
      experience: "",
      location: "",
      salary: "",
      skillInput: "",
      skills: [],
      description: "",
    });

  const saveJob = async () => {
    if (!form.title.trim()) {
      toast.add({ type: "error", title: "Job title is required" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      department: form.department.trim(),
      experience: form.experience.trim(),
      location: form.location.trim(),
      salary: form.salary.trim(),
      required_skills: form.skills,
      description: form.description.trim(),
      created_by: "recruiter",
    };
    try {
      const res = await fetch(
        apiUrl(editingId ? `/api/jobs/${editingId}` : "/api/jobs"),
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Request failed: ${res.status}`);
      }
      const saved: JobPosting = await res.json();
      setJobs((prev) =>
        editingId
          ? prev.map((j) => (j.job_id === editingId ? saved : j))
          : [saved, ...prev],
      );
      toast.add({
        type: "success",
        title: editingId ? "Job updated successfully" : "Job created successfully",
      });
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      toast.add({ type: "error", title: err.message || "Failed to save job" });
    } finally {
      setSaving(false);
    }
  };

  const deleteJob = async (id: string) => {
    // optimistic removal with rollback on failure
    const prev = jobs;
    setJobs((p) => p.filter((j) => j.job_id !== id));
    try {
      const res = await fetch(apiUrl(`/api/jobs/${id}`), { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.add({ type: "info", title: "Job deleted" });
    } catch {
      setJobs(prev);
      toast.add({ type: "error", title: "Failed to delete job" });
    }
  };

  const editJob = (job: JobPosting) => {
    setForm({
      title: job.title,
      department: job.department || "",
      experience: job.experience || "",
      location: job.location || "",
      salary: job.salary || "",
      skillInput: "",
      skills: job.required_skills || [],
      description: job.description || "",
    });
    setEditingId(job.job_id);
    setShowForm(true);
  };

  const suggestedSkills = [
    "Python", "JavaScript", "TypeScript", "React", "Node.js",
    "Docker", "Kubernetes", "AWS", "PostgreSQL", "MongoDB",
    "Machine Learning", "NLP", "Git", "CI/CD", "Agile",
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Job Postings
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create and manage job descriptions for screening.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingId(null);
            setShowForm(true);
          }}
          className="primary-btn"
        >
          <Plus className="h-4 w-4" /> New Job
        </button>
      </div>

      {/* Create/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-12 sm:pt-20 bg-black/30 backdrop-blur-sm overflow-y-auto"
            onClick={() => !saving && setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.97 }}
              className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingId ? "Edit Job" : "Create Job Posting"}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-gray-600 font-medium">Job Title *</label>
                    <input className="field mt-1" placeholder="Senior Software Engineer" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 font-medium">Department</label>
                    <input className="field mt-1" placeholder="Engineering" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 font-medium">Experience</label>
                    <input className="field mt-1" placeholder="3-5 years" value={form.experience} onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 font-medium">Location</label>
                    <input className="field mt-1" placeholder="Kathmandu, Nepal" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 font-medium">Salary Range</label>
                    <input className="field mt-1" placeholder="$80k-$120k" value={form.salary} onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))} />
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <label className="text-xs text-gray-600 font-medium">Required Skills</label>
                  <div className="flex gap-2 mt-1">
                    <input className="field flex-1" placeholder="Add a skill..." value={form.skillInput} onChange={(e) => setForm((f) => ({ ...f, skillInput: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} />
                    <button onClick={addSkill} className="ghost-btn px-3 text-sm">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.skills.map((s) => (
                      <span key={s} className="chip bg-blue-light text-blue border border-blue/20 flex items-center gap-1">
                        {s}
                        <button onClick={() => removeSkill(s)} className="hover:text-red transition-colors"><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2">
                    <p className="text-[10px] text-gray-400 mb-1">Suggested:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestedSkills.filter((s) => !form.skills.includes(s)).slice(0, 8).map((s) => (
                        <button key={s} onClick={() => setForm((f) => ({ ...f, skills: [...f.skills, s] }))} className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 hover:border-blue/30 hover:text-blue transition-colors">
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs text-gray-600 font-medium">Job Description</label>
                  <textarea className="field mt-1 h-32 resize-y" placeholder="Describe the role, responsibilities, and qualifications..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>

                {/* AI Suggestions Preview */}
                {form.description.length > 50 && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 mb-1">
                      <Sparkles className="h-3.5 w-3.5" /> AI Suggestions
                    </div>
                    <ul className="text-xs text-indigo-700 space-y-0.5">
                      <li>✓ Add specific years of experience requirements</li>
                      <li>✓ Include required certifications if applicable</li>
                      <li>✓ Mention team size and reporting structure</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6 justify-end">
                <button onClick={() => setShowForm(false)} className="ghost-btn text-sm" disabled={saving}>Cancel</button>
                <button onClick={saveJob} className="primary-btn" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingId ? "Update Job" : "Save Job"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Job List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100 border border-gray-200" />
          ))}
        </div>
      ) : jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.job_id} className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-blue shrink-0" />
                    <h3 className="text-base font-semibold text-gray-900 truncate">{job.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[job.department, job.location, job.experience].filter(Boolean).join(" · ") || "No details"}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(job.required_skills || []).slice(0, 8).map((s) => (
                      <span key={s} className="chip bg-blue-light text-blue text-[10px]">{s}</span>
                    ))}
                    {(job.required_skills || []).length > 8 && <span className="chip bg-gray-100 text-gray-500 text-[10px]">+{job.required_skills.length - 8}</span>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => editJob(job)} className="ghost-btn p-2" title="Edit"><Edit3 className="h-4 w-4" /></button>
                  <button onClick={() => deleteJob(job.job_id)} className="ghost-btn p-2 hover:!border-red/30 hover:!text-red" title="Delete"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              {job.description && <p className="text-xs text-gray-500 mt-3 line-clamp-2">{job.description}</p>}
              <p className="text-[10px] text-gray-400 mt-2">Created {job.created_at ? new Date(job.created_at).toLocaleDateString() : "—"}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-card">
          <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">No job postings yet</h3>
          <p className="text-sm text-gray-500 mt-1">Create your first job posting to start screening candidates.</p>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="primary-btn mt-4">
            <Plus className="h-4 w-4" /> Create Your First Job
          </button>
        </div>
      )}
    </div>
  );
}
