"use client";

import { BarChart3, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CandidateSkillGapPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/candidate" className="ghost-btn p-1.5">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="display-title text-3xl text-white">Skill Gap Analysis</h1>
          <p className="mt-1 text-sm text-zinc-400">See how your skills match job requirements.</p>
        </div>
      </div>
      <div className="glass-card p-12 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-zinc-600" />
        <h2 className="mt-4 text-lg font-semibold text-white">Upload Your Resume First</h2>
        <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
          Upload your resume and paste a job description to see detailed skill-gap analysis.
        </p>
        <Link href="/candidate" className="primary-btn mt-6 inline-flex">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
