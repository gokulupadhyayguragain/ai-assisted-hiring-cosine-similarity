"use client";

import { Upload, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CandidateUploadPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/candidate" className="ghost-btn p-1.5">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="display-title text-3xl text-white">My Resume</h1>
          <p className="mt-1 text-sm text-zinc-400">Upload and manage your resume.</p>
        </div>
      </div>
      <div className="glass-card p-12 text-center">
        <Upload className="mx-auto h-10 w-10 text-zinc-600" />
        <h2 className="mt-4 text-lg font-semibold text-white">Resume Upload</h2>
        <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
          Upload your resume to check skill-gap fit against job descriptions and see how you rank.
          Head to the Dashboard to check your fit.
        </p>
        <Link href="/candidate" className="primary-btn mt-6 inline-flex">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
