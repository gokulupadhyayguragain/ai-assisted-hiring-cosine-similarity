"use client";

import { useState, useEffect } from "react";
import { FileText, Search, ShieldCheck, AlertTriangle } from "lucide-react";
import { apiUrl } from "@/lib/api";

type JobRecord = {
  job_id: string;
  title: string;
  department: string;
  description: string;
  required_skills: string[];
  experience: string;
};

export default function JdManagerPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [biasResult, setBiasResult] = useState<{ score: number; findings: any[] } | null>(null);

  useEffect(() => {
    fetch(apiUrl("/api/jobs?limit=50"))
      .then((r) => r.json())
      .then(setJobs)
      .catch(() => setJobs([]));
  }, []);

  const filtered = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.department.toLowerCase().includes(search.toLowerCase()),
  );

  const auditJd = async (text: string) => {
    try {
      const res = await fetch(apiUrl("/api/analyze"), {
        method: "POST",
        body: (() => {
          const fd = new FormData();
          fd.append("job_text", text);
          fd.append("role", "recruiter");
          fd.append("tfidf_weight", "0.65");
          return fd;
        })(),
      });
      const data = await res.json();
      setBiasResult(data.bias_audit || null);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl text-white">JD Manager</h1>
        <p className="mt-1 text-sm text-zinc-400">Browse and audit job descriptions.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          className="field pl-9"
          placeholder="Search job descriptions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* JD List */}
        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-sm text-zinc-500">No job descriptions found.</p>
          )}
          {filtered.map((job) => (
            <button
              key={job.job_id}
              onClick={() => {
                setSelectedJob(job);
                setBiasResult(null);
              }}
              className={`w-full text-left glass-card p-4 transition-all ${
                selectedJob?.job_id === job.job_id ? "border-blue/40" : ""
              }`}
            >
              <h3 className="text-sm font-semibold text-white">{job.title}</h3>
              <p className="text-xs text-zinc-500">{job.department} · {job.experience}</p>
            </button>
          ))}
        </div>

        {/* JD Detail */}
        <div>
          {selectedJob ? (
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{selectedJob.title}</h2>
                <button onClick={() => auditJd(selectedJob.description)} className="ghost-btn text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" /> Audit JD
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedJob.required_skills.map((s) => (
                  <span key={s} className="chip bg-blue/10 text-blue/80 text-xs">{s}</span>
                ))}
              </div>
              <div className="rounded-xl bg-white/5 p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Description</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {selectedJob.description}
                </p>
              </div>

              {/* Bias Result */}
              {biasResult && (
                <div className={`rounded-xl p-4 ${biasResult.score < 70 ? "bg-red/10 border border-red/20" : biasResult.score < 90 ? "bg-amber/10 border border-amber/20" : "bg-green/10 border border-green/20"}`}>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-white">
                      <ShieldCheck className="h-4 w-4" />
                      Bias Audit Score: {biasResult.score}/100
                    </span>
                    {biasResult.score < 70 && <AlertTriangle className="h-4 w-4 text-red-soft" />}
                  </div>
                  {biasResult.findings.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {biasResult.findings.map((f: any, i: number) => (
                        <li key={i} className="text-xs text-zinc-400">
                          <span className="text-red-soft">“{f.term}”</span> — {f.suggestion}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-500">Select a JD to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
