"use client";

import { useState, useEffect } from "react";
import { BarChart3, Search, Download, ArrowUpDown, FileText } from "lucide-react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";

export default function RankingsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/api/sessions"))
      .then((r) => r.json())
      .then((data) => setSessions(data.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl text-white">Candidate Rankings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          View and compare ranked candidates from screening sessions.
        </p>
      </div>

      <div className="glass-card p-12 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-zinc-600" />
        <h2 className="mt-4 text-lg font-semibold text-white">Run a screening first</h2>
        <p className="mt-2 text-sm text-zinc-400 max-w-md mx-auto">
          Rankings are generated after you run a screening session. Head to the screening page to analyze resumes against a job description.
        </p>
        <Link href="/hr/screening" className="primary-btn mt-6 inline-flex">
          Go to Screening
        </Link>
      </div>
    </div>
  );
}
