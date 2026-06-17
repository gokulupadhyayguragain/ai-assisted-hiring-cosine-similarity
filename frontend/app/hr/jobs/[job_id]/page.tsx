"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Briefcase, MapPin, Clock, DollarSign, Users, ArrowLeft, Edit3, Save, X } from "lucide-react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.job_id as string;
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    fetch(apiUrl(`/api/jobs/${jobId}`))
      .then((r) => r.json())
      .then((data) => {
        setJob(data);
        setForm({
          title: data.title,
          department: data.department,
          experience: data.experience,
          location: data.location,
          salary: data.salary,
          required_skills: (data.required_skills || []).join(", "),
          description: data.description,
        });
      })
      .catch(() => setJob(null))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleSave = async () => {
    setSaving(true);
    const skills = form.required_skills.split(",").map((s: string) => s.trim()).filter(Boolean);
    try {
      const res = await fetch(apiUrl(`/api/jobs/${jobId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, required_skills: skills }),
      });
      if (res.ok) {
        const updated = await res.json();
        setJob(updated);
        setEditing(false);
      }
    } catch {}
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue/30 border-t-blue" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="glass-card p-12 text-center">
        <Briefcase className="mx-auto h-10 w-10 text-zinc-600" />
        <h2 className="mt-4 text-lg font-semibold text-white">Job Not Found</h2>
        <p className="mt-2 text-sm text-zinc-400">This job posting doesn't exist or has been deleted.</p>
        <Link href="/hr/jobs" className="primary-btn mt-6 inline-flex">
          Back to Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link href="/hr/jobs" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Jobs
        </Link>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="ghost-btn text-xs">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="primary-btn text-xs">
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="ghost-btn text-xs">
              <Edit3 className="h-3.5 w-3.5" /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="glass-card p-6 space-y-6">
        {!editing ? (
          <>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="display-title text-2xl text-white">{job.title}</h1>
                <span className="chip bg-blue/15 text-blue text-xs">{job.department}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {job.location}</span>
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {job.experience}</span>
                <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4" /> {job.salary}</span>
                <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {job.created_by}</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Required Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {job.required_skills.map((s: string) => (
                  <span key={s} className="chip bg-blue/10 text-blue/80 text-xs">{s}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Job Description</h3>
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{job.description}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <p className="text-xs text-zinc-600">Created {formatDate(job.created_at)} · Updated {formatDate(job.updated_at)}</p>
              <Link href={`/hr/screening?job_id=${job.job_id}`} className="primary-btn text-xs">
                Screen for this Job
              </Link>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-white">Edit Job Posting</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-zinc-400">Job Title *</label>
                <input className="field mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Department *</label>
                <input className="field mt-1" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Experience *</label>
                <input className="field mt-1" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Location *</label>
                <input className="field mt-1" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Salary Range *</label>
                <input className="field mt-1" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Required Skills (comma-separated)</label>
                <input className="field mt-1" value={form.required_skills} onChange={(e) => setForm({ ...form, required_skills: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400">Job Description *</label>
              <textarea rows={8} className="field mt-1 resize-y" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
