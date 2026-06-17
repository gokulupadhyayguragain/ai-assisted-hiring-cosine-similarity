"use client";

import { useState } from "react";
import { FileText, Eye, Download, Plus, Search, UploadCloud } from "lucide-react";
import Link from "next/link";
import { PdfViewer } from "@/components/hr/pdf-viewer";

const sampleJds = [
  { id: "JD-001", title: "Senior Software Engineer", dept: "Engineering", skills: "Python, FastAPI, PostgreSQL", file: "senior-swe-jd.pdf" },
  { id: "JD-002", title: "Frontend Developer", dept: "Engineering", skills: "React, TypeScript, Next.js", file: "frontend-jd.pdf" },
  { id: "JD-003", title: "Data Scientist", dept: "AI/ML", skills: "Python, TensorFlow, SQL", file: "ds-jd.pdf" },
  { id: "JD-004", title: "Product Manager", dept: "Product", skills: "Strategy, Analytics, Agile", file: "pm-jd.pdf" },
  { id: "JD-005", title: "DevOps Engineer", dept: "Infrastructure", skills: "Docker, K8s, CI/CD, AWS", file: "devops-jd.docx" },
];

export default function JdManagerPage() {
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<string | null>(null);

  const filtered = sampleJds.filter((jd) =>
    jd.title.toLowerCase().includes(query.toLowerCase()) ||
    jd.dept.toLowerCase().includes(query.toLowerCase()) ||
    jd.skills.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display-title text-2xl md:text-3xl text-white">JD Manager</h1>
          <p className="mt-1 text-sm text-zinc-400">Browse, upload, and view job descriptions.</p>
        </div>
        <Link href="/hr/jobs/create" className="primary-btn inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> Create New JD
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input className="field pl-9" placeholder="Search JDs..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="ghost-btn inline-flex items-center gap-2">
          <UploadCloud className="h-4 w-4" /> Upload JD File
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map((jd) => (
          <div key={jd.id} className="glass-card flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue/15 text-blue">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-white">{jd.title}</p>
                <p className="text-xs text-zinc-500">{jd.dept} &bull; {jd.skills}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setViewing(viewing === jd.id ? null : jd.id)} className="ghost-btn text-xs">
                <Eye className="h-3 w-3" /> {viewing === jd.id ? "Hide" : "View"}
              </button>
              <button className="ghost-btn text-xs"><Download className="h-3 w-3" /> Download</button>
            </div>
          </div>
        ))}
      </div>

      {viewing && (
        <div className="glass-card p-4">
          <p className="text-sm font-medium text-white mb-3">Preview: {sampleJds.find((j) => j.id === viewing)?.title}</p>
          <div className="rounded-xl bg-ink-900 p-10 text-center">
            <FileText className="mx-auto h-12 w-12 text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-500">PDF preview would render here via the backend convert endpoint.</p>
            <p className="text-xs text-zinc-600 mt-1">.docx files are automatically converted to PDF for preview.</p>
          </div>
        </div>
      )}
    </div>
  );
}
