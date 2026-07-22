"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  FileText,
  BarChart3,
  GitCompare,
  ShieldCheck,
  Upload,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

const QUICK_ACTIONS = [
  { href: "/hr/jobs", label: "New Job Posting", icon: Briefcase, desc: "Create a job posting with required skills" },
  { href: "/hr/jd-manager", label: "JD Manager", icon: FileText, desc: "Browse and manage job descriptions" },
  { href: "/hr/screening", label: "Run Screening", icon: BarChart3, desc: "Upload resumes and run AI screening" },
  { href: "/hr/compare", label: "Compare Resumes", icon: GitCompare, desc: "Side-by-side PDF comparison" },
  { href: "/hr/rankings", label: "View Rankings", icon: BarChart3, desc: "See ranked candidates from sessions" },
  { href: "/hr/bias", label: "Bias Audit", icon: ShieldCheck, desc: "Audit JDs for biased language" },
  { href: "/hr/analytics", label: "Analytics", icon: TrendingUp, desc: "View screening analytics and charts" },
];

export default function HrDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    fetch(apiUrl("/api/jobs?limit=5"))
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => setJobs([]));
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          HR Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage job postings, screen candidates, and compare resumes.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 hover:border-blue/30"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-light text-blue">
                <action.icon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {action.label}
                </h3>
                <p className="text-xs text-gray-500 line-clamp-1">
                  {action.desc}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 group-hover:text-blue group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Briefcase className="h-5 w-5 text-blue" />
            Recent Job Postings
          </h2>
          <Link
            href="/hr/jobs"
            className="text-xs text-blue hover:underline font-medium"
          >
            View all
          </Link>
        </div>
        {jobs.length > 0 ? (
          <div className="mt-4 divide-y divide-gray-100">
            {jobs.map((job: any) => (
              <Link
                key={job.job_id}
                href={`/hr/jobs/${job.job_id}`}
                className="flex items-center justify-between py-3 group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue transition-colors truncate">
                    {job.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {job.department} &middot; {job.location}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0 ml-2">
                  {job.experience}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            No job postings yet.{" "}
            <Link href="/hr/jobs" className="text-blue hover:underline font-medium">
              Create your first job
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
