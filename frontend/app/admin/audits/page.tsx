"use client";

import { ShieldCheck, Search, Filter } from "lucide-react";

const MOCK_LOGS = [
  { id: "1", action: "Screening Run", user: "HR Team", target: "Senior Dev Screening", timestamp: "2026-06-17 14:32", severity: "info" },
  { id: "2", action: "Model Uploaded", user: "Admin", target: "BGE-Small-EN-v1.5", timestamp: "2026-06-16 10:15", severity: "info" },
  { id: "3", action: "Bias Warning", user: "System", target: "JD #42 — potential gender bias", timestamp: "2026-06-15 09:45", severity: "warning" },
  { id: "4", action: "User Invited", user: "Admin", target: "recruiter@acme.com", timestamp: "2026-06-14 11:20", severity: "info" },
  { id: "5", action: "Export Downloaded", user: "HR Team", target: "Session #abc123 — CSV", timestamp: "2026-06-13 16:00", severity: "info" },
  { id: "6", action: "API Key Regenerated", user: "Admin", target: "HR Workspace API Key", timestamp: "2026-06-12 08:30", severity: "warning" },
];

export default function AdminAuditsPage() {
  const severityStyle = (s: string) =>
    s === "warning" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-light text-blue border-blue/20";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500">Track platform activity and security events.</p>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="field pl-9 text-sm" placeholder="Search logs..." />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
        <div className="divide-y divide-gray-100">
          {MOCK_LOGS.map((log) => (
            <div key={log.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <ShieldCheck className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{log.action}</p>
                <p className="text-xs text-gray-500">{log.target}</p>
              </div>
              <div className="text-right">
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${severityStyle(log.severity)}`}>
                  {log.severity}
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">{log.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
