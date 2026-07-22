"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Trash2, CheckCircle, Clock, AlertCircle, Download } from "lucide-react";
import { useNotifications } from "@/lib/notifications";

interface UploadedFile {
  id: string;
  name: string;
  size: string;
  type: string;
  status: "processing" | "ready" | "error";
  uploadedAt: string;
}

export default function UploadsPage() {
  const toast = useNotifications();
  const [files, setFiles] = useState<UploadedFile[]>([
    { id: "1", name: "john_doe_resume.pdf", size: "245 KB", type: "pdf", status: "ready", uploadedAt: new Date().toISOString() },
    { id: "2", name: "jane_smith_cv.docx", size: "180 KB", type: "docx", status: "ready", uploadedAt: new Date().toISOString() },
    { id: "3", name: "bob_wilson_resume.pdf", size: "312 KB", type: "pdf", status: "processing", uploadedAt: new Date().toISOString() },
  ]);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    const newFile: UploadedFile = {
      id: `file-${Date.now()}`,
      name: file.name,
      size: `${(file.size / 1024).toFixed(0)} KB`,
      type: file.name.split(".").pop() || "unknown",
      status: "processing",
      uploadedAt: new Date().toISOString(),
    };
    setFiles((prev) => [newFile, ...prev]);
    toast.add({ type: "success", title: `${file.name} uploaded` });
    // Simulate processing
    setTimeout(() => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === newFile.id ? { ...f, status: "ready" as const } : f
        )
      );
      toast.add({ type: "info", title: `${file.name} processed and ready` });
    }, 2000);
  };

  const deleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    toast.add({ type: "info", title: "File removed" });
  };

  const statusConfig = {
    processing: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50", label: "Processing" },
    ready: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", label: "Ready" },
    error: { icon: AlertCircle, color: "text-red", bg: "bg-red-50", label: "Error" },
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Uploads</h1>
        <p className="mt-1 text-sm text-gray-500">Manage uploaded resume files.</p>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); Array.from(e.dataTransfer.files).forEach(handleFile); }}
        className={`rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer ${
          dragging ? "border-blue/40 bg-blue-light/50" : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      >
        <Upload className={`h-10 w-10 mx-auto mb-3 ${dragging ? "text-blue" : "text-gray-300"}`} />
        <p className="text-sm font-medium text-gray-700">
          Drag & drop files here, or <span className="text-blue hover:underline">browse</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">Supports PDF, DOCX, TXT, MD</p>
        <input
          type="file"
          accept=".pdf,.docx,.txt,.md"
          multiple
          className="hidden"
          onChange={(e) => Array.from(e.target.files || []).forEach(handleFile)}
          id="file-input"
        />
        <button
          onClick={() => document.getElementById("file-input")?.click()}
          className="primary-btn mt-4"
        >
          <Upload className="h-4 w-4" /> Select Files
        </button>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-sm font-semibold text-gray-900">
              {files.length} file{files.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {files.map((file) => {
              const sc = statusConfig[file.status];
              const Icon = sc.icon;
              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <FileText className="h-8 w-8 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{file.size} &middot; {file.type.toUpperCase()}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 ${sc.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${sc.color}`} />
                    <span className={`text-xs font-medium ${sc.color}`}>{sc.label}</span>
                  </div>
                  <button onClick={() => deleteFile(file.id)} className="text-gray-400 hover:text-red transition-colors p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
