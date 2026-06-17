"use client";

import { Download, FileText, FileSpreadsheet, Eye, Search } from "lucide-react";
import { useState } from "react";

const reports = [
  { id: "RPT-001", session: "SES-001", title: "Software Engineer - Full Pipeline", type: "PDF", date: "2026-06-15", size: "2.3 MB" },
  { id: "RPT-002", session: "SES-001", title: "Software Engineer - CSV Export", type: "CSV", date: "2026-06-15", size: "180 KB" },
  { id: "RPT-003", session: "SES-002", title: "Backend Developer - Full Pipeline", type: "PDF", date: "2026-06-14", size: "1.8 MB" },
  { id: "RPT-004", session: "SES-002", title: "Backend Developer - CSV Export", type: "CSV", date: "2026-06-14", size: "145 KB" },
  { id: "RPT-005", session: "SES-003", title: "Data Science Intern - Full Pipeline", type: "PDF", date: "2026-06-12", size: "1.2 MB" },
];

export default function AdminReportsPage() {
  const [query, setQuery] = useState("");

  const filtered = reports.filter((r) =>
    !query || r.title.toLowerCase().includes(query.toLowerCase()) || r.session.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-2xl md:text-3xl text-white">Reports</h1>
        <p className="mt-1 text-sm text-zinc-400">Transparency reports and exportable screening results.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input className="field pl-9" placeholder="Search reports..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="space-y-2">
        {filtered.map((report) => (
          <div key={report.id} className="glass-card flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                report.type === "PDF" ? "bg-red/15 text-red-soft" : "bg-emerald-500/15 text-emerald-300"
              }`}>
                {report.type === "PDF" ? <FileText className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
              </span>
              <div>
                <p className="text-sm font-medium text-white">{report.title}</p>
                <p className="text-xs text-zinc-500">{report.session} &bull; {report.date} &bull; {report.size}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5">
                <Eye className="h-3 w-3" /> Preview
              </button>
              <button className="flex items-center gap-1 rounded-lg border border-blue/30 px-3 py-1.5 text-xs text-blue hover:bg-blue/10">
                <Download className="h-3 w-3" /> Download
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="glass-card p-10 text-center">
            <p className="text-zinc-400">No reports match your search.</p>
          </div>
        )}
      </div>

      <div className="glass-card p-4 text-sm text-zinc-400">
        <p>Reports generated per screening session include full pipeline PDFs, CSV exports, and per-candidate transparency reports.</p>
      </div>
    </div>
  );
}
