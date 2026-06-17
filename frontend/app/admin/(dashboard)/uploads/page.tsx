"use client";

import { FileText, UploadCloud, FileSpreadsheet, FileArchive, Trash2, Download } from "lucide-react";

const files = [
  { name: "Software Engineer JD.pdf", type: "Job Description", size: "245 KB", date: "2026-06-15" },
  { name: "resume_batch_01.pdf", type: "Resume Batch", size: "1.2 MB", date: "2026-06-14" },
  { name: "Backend Developer JD.docx", type: "Job Description", size: "180 KB", date: "2026-06-13" },
  { name: "frontend_candidates.pdf", type: "Resume Batch", size: "890 KB", date: "2026-06-12" },
  { name: "data_science_roles.txt", type: "Job Description", size: "64 KB", date: "2026-06-10" },
  { name: "internship_applications.pdf", type: "Resume Batch", size: "3.4 MB", date: "2026-06-08" },
];

const typeIcon = (type: string) => {
  switch (type) {
    case "Job Description": return FileText;
    case "Resume Batch": return FileSpreadsheet;
    default: return FileArchive;
  }
};

export default function UploadsPage() {
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
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue/15 text-blue">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white truncate max-w-36">{file.name}</p>
                    <p className="text-xs text-zinc-500">{file.type}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
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

      <div className="glass-card p-5">
        <h2 className="font-semibold text-white">Supported Formats</h2>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {[".pdf", ".docx", ".doc", ".txt", ".md", ".rtf"].map((fmt) => (
            <span key={fmt} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">{fmt}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
