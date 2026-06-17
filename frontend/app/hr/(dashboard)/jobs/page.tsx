"use client";

import { Plus, ArrowRight, Clock3, FileText, Layers3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Modal, SkeletonCard } from "@/components/ui";
import type { JobRecord } from "@/lib/jobs";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function HrJobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<JobRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await fetch(`${API_BASE}/api/jobs?limit=25`);
      const body = await response.json();
      if (active && response.ok) setJobs(body);
      if (active) setLoading(false);
    }
    load().catch(() => setLoading(false));
    return () => { active = false; };
  }, []);

  async function deleteJob() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(`${API_BASE}/api/jobs/${deleteTarget.job_id}`, { method: "DELETE" });
      if (!response.ok) return;
      setJobs((current) => current.filter((item) => item.job_id !== deleteTarget.job_id));
      setDeleteTarget(null);
    } finally { setDeleting(false); }
  }

  return (<>
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display-title text-2xl md:text-3xl text-white">Job Postings</h1>
          <p className="mt-1 text-sm text-zinc-400">Create and manage job descriptions for screening.</p>
        </div>
        <Link href="/hr/jobs/create" className="primary-btn inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create Job
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/hr/jobs/create" className="glass-card flex items-center gap-3 p-4 rounded-2xl hover:-translate-y-0.5 transition-all">
          <Layers3 size={18} className="text-blue" /> Create new job posting
        </Link>
        <Link href="/hr/screening" className="glass-card flex items-center gap-3 p-4 rounded-2xl hover:-translate-y-0.5 transition-all">
          <FileText size={18} className="text-blue" /> Run screening against a job
        </Link>
        <Link href="/hr/rankings" className="glass-card flex items-center gap-3 p-4 rounded-2xl hover:-translate-y-0.5 transition-all">
          <Clock3 size={18} className="text-blue" /> View latest rankings
        </Link>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white">All Jobs</h2>
        <div className="mt-4 space-y-2">
          {loading && (<><SkeletonCard /><SkeletonCard /></>)}
          {!loading && jobs.length === 0 && <p className="text-sm text-zinc-400">No jobs created yet.</p>}
          {jobs.map((job) => (
            <div key={job.job_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-zinc-500">{job.department}</p>
                  <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                  <p className="text-sm text-zinc-400">{job.location} &bull; {job.experience}</p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/hr/jobs/create?jobId=${job.job_id}`} className="ghost-btn text-xs">Edit</Link>
                  <Link href={`/hr/screening?jobId=${job.job_id}`} className="ghost-btn text-xs">Screen</Link>
                  <button type="button" className="ghost-btn text-xs" onClick={() => setDeleteTarget(job)}>Delete</button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(job.required_skills || []).slice(0, 6).map((skill) => (
                  <span key={skill} className="chip bg-blue/10 text-blue-soft text-xs">{skill}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <Modal open={Boolean(deleteTarget)} title="Delete job" onClose={() => setDeleteTarget(null)}>
      {deleteTarget && (
        <div className="space-y-3 text-zinc-200">
          <p className="text-sm">Remove {deleteTarget.title}?</p>
          <div className="flex gap-2">
            <button type="button" className="primary-btn" onClick={deleteJob} disabled={deleting}>Delete</button>
            <button type="button" className="ghost-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
          </div>
        </div>
      )}
    </Modal>
  </>);
}
