"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, RefreshCw, Search, Briefcase, Building2,
  MapPin, ExternalLink, Trash2, DollarSign, Calendar,
  ChevronDown, ChevronUp, Database, CheckCircle, XCircle,
} from "lucide-react";
import { apiFetch, authHeaders } from "@/lib/api";
import { useNotifications } from "@/lib/notifications";

type ExternalJob = {
  job_id: string;
  source: string;
  source_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salary_min: number | null;
  salary_max: number | null;
  required_skills: string[];
  remote: boolean;
  imported_at: string;
};

type JobSource = {
  id: string;
  name: string;
  configured: boolean;
  docs_url: string;
  needs_api_key: boolean;
};

export default function ExternalJobsPage() {
  const toast = useNotifications();
  const [jobs, setJobs] = useState<ExternalJob[]>([]);
  const [sources, setSources] = useState<JobSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Import form state
  const [showGreenhouseForm, setShowGreenhouseForm] = useState(false);
  const [greenhouseTokens, setGreenhouseTokens] = useState("");

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100", source: "greenhouse" });
      if (search) params.set("query", search);
      const data = await apiFetch<{ jobs: ExternalJob[] }>(`/api/external-jobs?${params}`, {
        headers: { ...authHeaders() },
      });
      setJobs(data.jobs ?? []);
    } catch {
      // Silent fail — backend may not be running or user not authenticated
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchSources = useCallback(async () => {
    try {
      const data = await apiFetch<{ sources: JobSource[] }>("/api/external-jobs/sources");
      setSources((data.sources ?? []).filter((s) => s.id === "greenhouse"));
    } catch {
      // Silent fail
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchSources();
  }, [fetchJobs, fetchSources]);

  const importGreenhouse = async () => {
    setImporting("greenhouse");
    const tokens = greenhouseTokens.split(",").map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0) {
      toast.add({ type: "error", title: "Enter at least one Greenhouse board token" });
      setImporting(null);
      return;
    }
    try {
      const data = await apiFetch<{ imported: number; source: string }>("/api/external-jobs/import/greenhouse", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ board_tokens: tokens, max_per_company: 50 }),
      });
      toast.add({ type: "success", title: `Imported ${data.imported} jobs from Greenhouse` });
      setShowGreenhouseForm(false);
      fetchJobs();
    } catch (err: any) {
      toast.add({ type: "error", title: err.message || "Greenhouse import failed" });
    } finally {
      setImporting(null);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      await apiFetch(`/api/external-jobs/${jobId}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      toast.add({ type: "info", title: "Job deleted" });
      setJobs((prev) => prev.filter((j) => j.job_id !== jobId));
    } catch (err: any) {
      toast.add({ type: "error", title: err.message || "Delete failed" });
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (search) {
      const q = search.toLowerCase();
      if (!j.title?.toLowerCase().includes(q) && !j.company?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">External Jobs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Import and manage job listings from Greenhouse company boards.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGreenhouseForm((v) => !v)} className="primary-btn">
            <Building2 className="h-4 w-4" /> Import from Greenhouse
          </button>
        </div>
      </div>

      {/* Import Form */}
      <AnimatePresence>
        {showGreenhouseForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-emerald-600" /> Import from Greenhouse
              </h3>
              <button onClick={() => setShowGreenhouseForm(false)} className="text-gray-400 hover:text-gray-600"><XCircle className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 mb-3">
              <div>
                <label className="text-xs text-gray-600 font-medium">Company Board Tokens</label>
                <input className="field mt-1 text-sm" placeholder="airbnb, stripe, dropbox" value={greenhouseTokens} onChange={(e) => setGreenhouseTokens(e.target.value)} />
                <p className="text-[10px] text-gray-400 mt-1">Comma-separated. No API key needed — Greenhouse boards are public.</p>
              </div>
              <div className="flex items-end">
                <button
                  onClick={importGreenhouse}
                  disabled={importing === "greenhouse" || !greenhouseTokens.trim()}
                  className="primary-btn w-full justify-center"
                >
                  {importing === "greenhouse" ? "Importing..." : <><RefreshCw className="h-4 w-4" /> Import</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="field pl-9 text-sm" placeholder="Search jobs or companies..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={fetchJobs} className="ghost-btn text-sm">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
        <span className="text-xs text-gray-400">{filteredJobs.length} jobs</span>
      </div>

      {/* Job List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue" />
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="space-y-3">
          {filteredJobs.map((job, idx) => (
            <motion.div
              key={job.job_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden"
            >
              <button
                onClick={() => setExpandedJob(expandedJob === job.job_id ? null : job.job_id)}
                className="w-full text-left p-4 sm:p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue to-red text-white shrink-0">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-gray-900">{job.title}</h3>
                      <span className="chip text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {job.source}
                      </span>
                      {job.remote && (
                        <span className="chip text-[9px] bg-blue-light text-blue">Remote</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {job.company}</span>
                      {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {job.location}</span>}
                      {(job.salary_min || job.salary_max) && (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <DollarSign className="h-3 w-3" />
                          {job.salary_min ? `$${job.salary_min.toLocaleString()}` : ""}
                          {job.salary_min && job.salary_max ? " - " : ""}
                          {job.salary_max ? `$${job.salary_max.toLocaleString()}` : ""}
                        </span>
                      )}
                    </div>
                    {job.required_skills && job.required_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {job.required_skills.slice(0, 5).map((s) => (
                          <span key={s} className="chip bg-gray-50 text-gray-600 text-[9px] border border-gray-100">{s}</span>
                        ))}
                        {job.required_skills.length > 5 && (
                          <span className="chip bg-gray-50 text-gray-400 text-[9px]">+{job.required_skills.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="ghost-btn p-2"
                      title="Open original listing"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteJob(job.job_id); }}
                      className="ghost-btn p-2 hover:!border-red/30 hover:!text-red"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {expandedJob === job.job_id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </div>
                </div>
              </button>

              <AnimatePresence>
                {expandedJob === job.job_id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100"
                  >
                    <div className="p-4 sm:p-5 space-y-3">
                      <p className="text-sm text-gray-700 leading-relaxed">{job.description}</p>
                      {job.required_skills && job.required_skills.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-900 mb-1">Required Skills ({job.required_skills.length})</p>
                          <div className="flex flex-wrap gap-1.5">
                            {job.required_skills.map((s) => (
                              <span key={s} className="chip bg-blue-light text-blue text-[10px]">{s}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Imported {new Date(job.imported_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Database className="h-3 w-3" /> ID: {job.job_id}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-card">
          <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">No external jobs</h3>
          <p className="text-sm text-gray-500 mt-1">
            Import jobs from Greenhouse to see them here.
          </p>
        </div>
      )}

      {/* Source Status */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Integration Status</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center gap-3">
                {s.configured ? (
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-300" />
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500">
                    {s.configured ? "Configured & ready" : s.needs_api_key ? "API key needed" : "Ready (no auth)"}
                  </p>
                </div>
              </div>
              {!s.configured && s.docs_url && (
                <a href={s.docs_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue hover:underline">
                  Get API Key
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
