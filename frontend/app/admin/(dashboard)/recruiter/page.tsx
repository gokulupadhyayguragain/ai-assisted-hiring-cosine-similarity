"use client";

import { ArrowRight, Clock3, FileText, Layers3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Modal, SkeletonCard } from "@/components/ui";
import type { JobRecord } from "@/lib/jobs";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function RecruiterHomePage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<JobRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await fetch(`${API_BASE}/api/jobs?limit=5`);
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
      <div className="glass-card p-6">
        <p className="eyebrow">Recruiter Workspace</p>
        <h1 className="display-title text-2xl md:text-3xl text-white mt-2">Single-path hiring workflow</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Build job profile, upload candidate files, run anonymized AI ranking, then audit and export reports.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/recruiter/create" className="primary-btn">
            Create Job <ArrowRight size={16} />
          </Link>
          <Link href="/admin/recruiter/process" className="ghost-btn">Run AI Screening</Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Link href="/admin/recruiter/create" className="glass-card flex items-center gap-3 p-4 rounded-2xl hover:-translate-y-0.5 transition-all">
          <Layers3 size={18} className="text-blue" /> Define role requirements
        </Link>
        <Link href="/admin/recruiter/upload" className="glass-card flex items-center gap-3 p-4 rounded-2xl hover:-translate-y-0.5 transition-all">
          <FileText size={18} className="text-blue" /> Prepare files and context
        </Link>
        <Link href="/admin/recruiter/rankings" className="glass-card flex items-center gap-3 p-4 rounded-2xl hover:-translate-y-0.5 transition-all">
          <Clock3 size={18} className="text-blue" /> View latest ranking output
        </Link>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white">Recent Jobs</h2>
        <div className="mt-4 space-y-2">
          {loading && (<><SkeletonCard /><SkeletonCard /></>)}
          {!loading && jobs.length === 0 && <p className="text-sm text-zinc-400">No jobs created yet.</p>}
          {jobs.map((job) => (
            <div key={job.job_id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wider text-zinc-400">{job.department}</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{job.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">{job.location} &bull; {job.experience}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/admin/recruiter/create?jobId=${job.job_id}`} className="ghost-btn">Edit</Link>
                <button type="button" className="ghost-btn" onClick={() => setDeleteTarget(job)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    <Modal open={Boolean(deleteTarget)} title="Delete job" onClose={() => setDeleteTarget(null)}>
      {deleteTarget && (
        <div className="space-y-3 text-zinc-200">
          <p className="text-sm">Remove {deleteTarget.title} from saved job postings?</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="primary-btn" onClick={deleteJob} disabled={deleting}>Confirm Delete</button>
            <button type="button" className="ghost-btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
          </div>
        </div>
      )}
    </Modal>
  </>);
}
