"use client";

import { FileText, UploadCloud, FileSpreadsheet, Trash2, Download } from "lucide-react";

const files = [
  { name: "Software Engineer JD.pdf", type: "Job Description", size: "245 KB", date: "2026-06-15" },
  { name: "resume_batch_01.pdf", type: "Resume Batch", size: "1.2 MB", date: "2026-06-14" },
  { name: "Backend Developer JD.docx", type: "Job Description", size: "180 KB", date: "2026-06-13" },
  { name: "frontend_candidates.pdf", type: "Resume Batch", size: "890 KB", date: "2026-06-12" },
  { name: "data_science_roles.docx", type: "Job Description", size: "64 KB", date: "2026-06-10" },
];

const typeIcon = (type: string) => type === "Job Description" ? FileText : FileSpreadsheet;

export default function HrUploadsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="display-title text-2xl md:text-3xl text-white">Uploads</h1>
          <p className="mt-1 text-sm text-zinc-400">Manage uploaded resumes and job description files.</p>
        </div>
        <button className="primary-btn inline-flex items-center gap-2">
          <UploadCloud className="h-4 w-4" /> Upload Files
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {files.map((file) => {
          const Icon = typeIcon(file.type);
          return (
            <div key={file.name} className="glass-card group p-5 transition-all duration-300 hover:border-white/20">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue/15 text-blue">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500">{file.type}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                <span>{file.size}</span>
                <span>{file.date}</span>
              </div>
              <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-zinc-300 hover:bg-white/5">
                  <Download className="h-3 w-3" /> Download
                </button>
                <button className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-red-300 hover:bg-red/10">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
