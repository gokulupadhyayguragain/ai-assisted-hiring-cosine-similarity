"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui";
import { loadDraft, saveDraft, type JobDraft, type JobRecord } from "@/lib/jobs";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

const initialDraft: JobDraft = {
  title: "", department: "Engineering", experience: "2+ years", location: "Kathmandu",
  salary: "Negotiable", skills: "Python, FastAPI, PostgreSQL, Docker", description: "",
};

export default function RecruiterCreateJobPage() {
  const [draft, setDraft] = useState<JobDraft>(initialDraft);
  const [savedJob, setSavedJob] = useState<JobRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editJobId, setEditJobId] = useState("");
  const [loadingJob, setLoadingJob] = useState(false);

  useEffect(() => {
    const persisted = loadDraft();
    if (persisted) setDraft(persisted);
    const jobId = new URLSearchParams(window.location.search).get("jobId") || "";
    if (!jobId) return;
    setEditJobId(jobId); setLoadingJob(true);
    fetch(`${API_BASE}/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then((body) => {
        if (!body.job_id) return;
        setDraft({ title: body.title, department: body.department, experience: body.experience, location: body.location, salary: body.salary, skills: (body.required_skills || []).join(", "), description: body.description });
      }).catch(() => undefined).finally(() => setLoadingJob(false));
  }, []);

  useEffect(() => { saveDraft(draft); }, [draft]);

  const canSave = useMemo(() => draft.title.trim().length > 1 && draft.description.trim().length > 10, [draft]);

  async function submit() {
    if (!canSave || submitting) return;
    setSubmitting(true); setError("");
    try {
      const response = await fetch(editJobId ? `${API_BASE}/api/jobs/${editJobId}` : `${API_BASE}/api/jobs`, {
        method: editJobId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title, department: draft.department, experience: draft.experience,
          location: draft.location, salary: draft.salary,
          required_skills: draft.skills.split(",").map((s) => s.trim()).filter(Boolean),
          description: draft.description, created_by: "recruiter",
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Could not save job");
      setSavedJob(body);
      window.localStorage.setItem("latest.jobId", body.job_id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save job"); }
    finally { setSubmitting(false); }
  }

  return (<>
    <div className="max-w-5xl">
      <div className="glass-card p-6">
        <h1 className="display-title text-2xl md:text-3xl text-white">{editJobId ? "Edit job" : "Create job"}</h1>
        <p className="mt-2 text-sm text-zinc-400">Define role requirements and save to the database.</p>
        {loadingJob && <p className="mt-2 text-sm text-zinc-400">Loading job details...</p>}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Job title</span>
            <input className="field" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Department</span>
            <input className="field" value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Experience</span>
            <input className="field" value={draft.experience} onChange={(e) => setDraft({ ...draft, experience: e.target.value })} />
          </label>
          <label className="space-y-2">
            <span className="text-sm text-zinc-300">Location</span>
            <input className="field" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-zinc-300">Salary</span>
            <input className="field" value={draft.salary} onChange={(e) => setDraft({ ...draft, salary: e.target.value })} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-zinc-300">Required skills (comma-separated)</span>
            <input className="field" value={draft.skills} onChange={(e) => setDraft({ ...draft, skills: e.target.value })} />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm text-zinc-300">Description</span>
            <textarea className="field min-h-56" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-200">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <button className="primary-btn" type="button" disabled={!canSave || submitting} onClick={submit}>
            {editJobId ? "Update Job" : "Save Job"}
          </button>
          <Link href="/admin/recruiter/upload" className="ghost-btn">Continue to Upload</Link>
        </div>
      </div>
    </div>

    <Modal open={Boolean(savedJob)} title={editJobId ? "Job updated" : "Job saved"} onClose={() => setSavedJob(null)}>
      {savedJob && (
        <div className="space-y-3 text-zinc-200">
          <p className="inline-flex items-center gap-2 text-emerald-200"><CheckCircle2 size={16} /> Job posting saved.</p>
          <p className="text-sm">{savedJob.title} ({savedJob.job_id})</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/recruiter/upload" className="primary-btn">Go to Upload</Link>
            <Link href="/admin/recruiter" className="ghost-btn">Back Home</Link>
          </div>
        </div>
      )}
    </Modal>
  </>);
}
