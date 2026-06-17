"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { JobRecord } from "@/lib/jobs";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function RecruiterUploadPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await fetch(`${API_BASE}/api/jobs?limit=25`);
      const body = await response.json();
      if (active && response.ok) {
        setJobs(body);
        const latest = window.localStorage.getItem("latest.jobId") || body[0]?.job_id || "";
        setSelected(latest);
      }
    }
    load().catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <div className="max-w-5xl">
      <div className="glass-card p-6">
        <h1 className="display-title text-2xl md:text-3xl text-white">Upload Preparation</h1>
        <p className="mt-2 text-sm text-zinc-400">Select the saved job context before processing resumes.</p>

        <label className="mt-5 block space-y-2">
          <span className="text-sm text-zinc-300">Saved job</span>
          <select className="field" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Select a job</option>
            {jobs.map((job) => (
              <option key={job.job_id} value={job.job_id}>{job.title} ({job.department})</option>
            ))}
          </select>
        </label>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-400">
          Job files and resumes are uploaded in the Processing page.
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="primary-btn" disabled={!selected}
            onClick={() => { window.localStorage.setItem("latest.jobId", selected); window.location.href = "/admin/recruiter/process"; }}>
            Continue to Processing
          </button>
          <Link href="/admin/recruiter/create" className="ghost-btn">Back to Create</Link>
        </div>
      </div>
    </div>
  );
}
