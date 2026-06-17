"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Briefcase, FileText, BarChart3, GitCompare, ShieldCheck, Upload, ArrowRight } from "lucide-react";
import { apiUrl } from "@/lib/api";

const QUICK_ACTIONS = [
  { href: "/hr/jobs", label: "New Job Posting", icon: Briefcase, desc: "Create a job posting with required skills" },
  { href: "/hr/jd-manager", label: "JD Manager", icon: FileText, desc: "Browse and manage job descriptions" },
  { href: "/hr/screening", label: "Run Screening", icon: BarChart3, desc: "Upload resumes and run AI screening" },
  { href: "/hr/compare", label: "Compare Resumes", icon: GitCompare, desc: "Side-by-side PDF comparison" },
  { href: "/hr/rankings", label: "View Rankings", icon: BarChart3, desc: "See ranked candidates from sessions" },
  { href: "/hr/bias", label: "Bias Audit", icon: ShieldCheck, desc: "Audit JDs for biased language" },
];

export default function HrDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    fetch(apiUrl("/api/jobs?limit=5"))
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => setJobs([]));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-title text-3xl text-white">HR Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage job postings, screen candidates, and compare resumes.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group glass-card p-5 transition-all duration-300 hover:border-blue/40 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue/15 text-blue">
                <action.icon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">{action.label}</h3>
                <p className="text-xs text-zinc-500">{action.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-blue group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Briefcase className="h-5 w-5 text-blue" />
            Recent Job Postings
          </h2>
          <Link href="/hr/jobs" className="text-xs text-blue hover:underline">
            View all
          </Link>
        </div>
        {jobs.length > 0 ? (
          <div className="mt-4 divide-y divide-white/5">
            {jobs.map((job: any) => (
              <Link
                key={job.job_id}
                href={`/hr/jobs/${job.job_id}`}
                className="flex items-center justify-between py-3 group"
              >
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-blue transition-colors">
                    {job.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {job.department} &middot; {job.location}
                  </p>
                </div>
                <span className="text-xs text-zinc-600">{job.experience}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            No job postings yet.{" "}
            <Link href="/hr/jobs" className="text-blue hover:underline">
              Create your first job
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
