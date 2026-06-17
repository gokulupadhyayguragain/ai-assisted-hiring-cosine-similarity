"use client";

import { useState } from "react";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { apiUrl } from "@/lib/api";

export default function UploadsPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setMessage(null);

    try {
      // Upload each file individually for now
      let success = 0;
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch(apiUrl("/api/convert"), { method: "POST", body: fd });
        if (res.ok) success++;
      }

      setMessage({
        type: "success",
        text: `${success}/${files.length} files processed successfully. They're ready for screening and comparison.`,
      });
      setFiles([]);
    } catch {
      setMessage({ type: "error", text: "Upload failed. Check backend connection." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-3xl text-white">Uploads</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Upload resumes, CVs, and job descriptions for processing.
        </p>
      </div>

      <div className="glass-card p-8">
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-12 hover:border-blue/30 transition-colors">
          <Upload className="h-10 w-10 text-zinc-600" />
          <p className="mt-4 text-sm text-zinc-400">Drop files here or click to browse</p>
          <p className="mt-1 text-xs text-zinc-600">Supports PDF, DOCX, TXT, MD</p>
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </div>

        {files.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
              Selected Files ({files.length})
            </p>
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                <FileText className="h-4 w-4 text-blue" />
                <span className="flex-1 text-sm text-zinc-300">{f.name}</span>
                <span className="text-xs text-zinc-600">{(f.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
            <button onClick={handleUpload} disabled={uploading} className="primary-btn mt-4 w-full justify-center">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : `Upload ${files.length} File${files.length > 1 ? "s" : ""}`}
            </button>
          </div>
        )}

        {message && (
          <div className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs ${
            message.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red/10 text-red-soft"
          }`}>
            {message.type === "success" ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
