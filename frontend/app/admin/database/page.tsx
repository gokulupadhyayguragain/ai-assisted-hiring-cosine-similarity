"use client";

import { Database, HardDrive, Activity, Clock, Table2 } from "lucide-react";

export default function AdminDatabasePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Database</h1>
        <p className="text-sm text-gray-500">PostgreSQL database overview and management.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Database Size", value: "256 MB", icon: HardDrive, color: "text-blue" },
          { label: "Tables", value: "4", icon: Table2, color: "text-emerald-600" },
          { label: "Sessions Stored", value: "42", icon: Activity, color: "text-indigo-600" },
          { label: "Avg Query Time", value: "12ms", icon: Clock, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <p className="mt-2 text-xl font-semibold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Tables</h3>
        <div className="space-y-2">
          {[
            { name: "screening_sessions", rows: "42", size: "128 MB", indexes: "2" },
            { name: "job_postings", rows: "18", size: "48 MB", indexes: "2" },
            { name: "external_jobs", rows: "156", size: "64 MB", indexes: "3" },
            { name: "users", rows: "8", size: "16 MB", indexes: "1" },
          ].map((t) => (
            <div key={t.name} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-blue" />
                <span className="font-medium text-gray-900">{t.name}</span>
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>{t.rows} rows</span>
                <span>{t.size}</span>
                <span>{t.indexes} indexes</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
