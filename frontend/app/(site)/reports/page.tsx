"use client";

import { motion } from "framer-motion";
import { FileText, Download, Eye, Calendar, ArrowRight, ShieldCheck, TrendingUp } from "lucide-react";
import Link from "next/link";

const MOCK_REPORTS = [
  { id: "1", title: "Q1 2025 Screening Summary", type: "Analytics", date: "2025-03-31", pages: 12, status: "Published" },
  { id: "2", title: "Bias Audit Report - Engineering", type: "Bias Audit", date: "2025-03-28", pages: 8, status: "Draft" },
  { id: "3", title: "Candidate Fit Analysis - Full Stack", type: "Matching", date: "2025-03-25", pages: 6, status: "Published" },
  { id: "4", title: "Monthly Hiring Funnel Report", type: "Analytics", date: "2025-03-01", pages: 15, status: "Published" },
  { id: "5", title: "Skill Gap Analysis - Data Team", type: "Skills", date: "2025-02-28", pages: 10, status: "Draft" },
  { id: "6", title: "Transparency Report - Session #42", type: "Compliance", date: "2025-02-20", pages: 4, status: "Published" },
];

const typeColors: Record<string, string> = {
  Analytics: "bg-blue-light text-blue",
  "Bias Audit": "bg-amber-50 text-amber-700",
  Matching: "bg-emerald-50 text-emerald-700",
  Skills: "bg-purple-50 text-purple-700",
  Compliance: "bg-indigo-50 text-indigo-600",
};

export default function ReportsPage() {
  return (
    <div className="container-px pt-28 pb-20">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-6 w-6 text-blue" />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Reports</h1>
          </div>
          <p className="text-gray-500 max-w-2xl">
            Download detailed reports on screening sessions, bias audits, candidate matching, and hiring analytics.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mt-8">
          {[
            { label: "Total Reports", value: "24", icon: FileText, color: "text-blue" },
            { label: "Bias Audits", value: "8", icon: ShieldCheck, color: "text-amber-600" },
            { label: "Screening Reports", value: "14", icon: TrendingUp, color: "text-emerald-600" },
            { label: "This Month", value: "5", icon: Calendar, color: "text-indigo-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-card">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <p className="mt-2 text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Reports List */}
        <div className="mt-8 space-y-3">
          {MOCK_REPORTS.map((report, idx) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card hover:shadow-card-hover transition-all"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{report.title}</h3>
                    <span className={`chip text-[10px] ${typeColors[report.type] || "bg-gray-100 text-gray-600"}`}>{report.type}</span>
                    <span className={`chip text-[10px] ${report.status === "Published" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>{report.status}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {report.date}</span>
                    <span>{report.pages} pages</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button className="ghost-btn text-xs"><Eye className="h-3.5 w-3.5" /> Preview</button>
                  <button className="primary-btn text-xs"><Download className="h-3.5 w-3.5" /> Download</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 rounded-2xl bg-gradient-to-br from-blue-light to-indigo-50 border border-blue/20 p-6 sm:p-8 text-center">
          <h2 className="text-lg font-bold text-gray-900">Need a custom report?</h2>
          <p className="text-sm text-gray-600 mt-1">Run a new screening session or bias audit to generate fresh reports.</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link href="/hr/screening" className="primary-btn"><TrendingUp className="h-4 w-4" /> Run Screening</Link>
            <Link href="/hr/bias" className="ghost-btn text-sm"><ShieldCheck className="h-4 w-4" /> Bias Audit</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
