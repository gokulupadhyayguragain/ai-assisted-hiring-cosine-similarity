"use client";

import { useState, useEffect } from "react";
import { Briefcase, Plus, X, MapPin, DollarSign, Clock, Users } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

type JobRecord = {
  job_id: string;
  created_at: string;
  updated_at: string;
  title: string;
  department: string;
  experience: string;
  location: string;
  salary: string;
  required_skills: string[];
  description: string;
  created_by: string;
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: "",
    department: "",
    experience: "",
    location: "",
    salary: "",
    required_skills: "",
    description: "",
  });

  const fetchJobs = () => {
    setLoading(true);
    fetch(apiUrl("/api/jobs?limit=50"))
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchJobs(); }, []);

  const createJob = async (e: React.FormEvent) => {
    e.preventDefault();
    const skills = form.required_skills.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      const res = await fetch(apiUrl("/api/jobs"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, required_skills: skills }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({ title: "", department: "", experience: "", location: "", salary: "", required_skills: "", description: "" });
        fetchJobs();
      }
    } catch {}
  };

  const deleteJob = async (id: string) => {
    if (!confirm("Delete this job posting?")) return;
    try {
      await fetch(apiUrl(`/api/jobs/${id}`), { method: "DELETE" });
      fetchJobs();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display-title text-3xl text-white">Job Postings</h1>
          <p className="mt-1 text-sm text-zinc-400">Create and manage job postings.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="primary-btn">
          <Plus className="h-4 w-4" /> New Job
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Create New Job Posting</h2>
              <button onClick={() => setShowCreate(false)} className="ghost-btn p-1.5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={createJob} className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-zinc-400">Job Title *</label>
                  <input required className="field mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Department *</label>
                  <input required className="field mt-1" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Experience *</label>
                  <input required placeholder="e.g. 3-5 years" className="field mt-1" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Location *</label>
                  <input required className="field mt-1" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Salary Range *</label>
                  <input required className="field mt-1" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Required Skills (comma-separated)</label>
                  <input className="field mt-1" placeholder="Python, FastAPI, PostgreSQL" value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400">Job Description *</label>
                <textarea required rows={6} className="field mt-1 resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="ghost-btn">Cancel</button>
                <button type="submit" className="primary-btn">Create Job</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue/30 border-t-blue" />
        </div>
      )}

      {/* Job List */}
      {!loading && jobs.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Briefcase className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">No job postings yet.</p>
          <button onClick={() => setShowCreate(true)} className="primary-btn mt-4">Create your first job</button>
        </div>
      )}

      {jobs.length > 0 && (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <div key={job.job_id} className="glass-card p-5 group hover:border-blue/30 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                    <span className="chip bg-blue/15 text-blue text-xs">{job.department}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {job.experience}</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> {job.salary}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {job.created_by}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.required_skills.map((skill) => (
                      <span key={skill} className="chip bg-blue/10 text-blue/80 text-xs">{skill}</span>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-zinc-400 line-clamp-2">{job.description}</p>
                  <p className="mt-2 text-xs text-zinc-600">Created {formatDate(job.created_at)}</p>
                </div>
                <div className="flex items-start gap-2 ml-4">
                  <Link href={`/hr/screening?job_id=${job.job_id}`} className="ghost-btn text-xs py-1.5">
                    Screen
                  </Link>
                  <button onClick={() => deleteJob(job.job_id)} className="ghost-btn text-xs py-1.5 text-red-soft hover:border-red/30">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
