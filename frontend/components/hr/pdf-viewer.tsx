"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { FileText, Download, ZoomIn, ZoomOut, AlertCircle } from "lucide-react";

// Set worker for pdf.js
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl?: string;
  fileName?: string;
  /* For in-memory PDF data (base64) */
  fileData?: string;
  onClose?: () => void;
}

export function PdfViewer({ fileUrl, fileName, fileData, onClose }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [error, setError] = useState<string | null>(null);

  const fileSource = fileData
    ? { data: atob(fileData) }
    : fileUrl;

  function onDocumentLoadSuccess({ numPages: n }: { numPages: number }) {
    setNumPages(n);
    setError(null);
  }

  function onDocumentLoadError(err: Error) {
    setError(`Failed to load PDF: ${err.message}`);
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-soft" />
        <p className="mt-3 text-sm text-zinc-300">{error}</p>
        {fileName && (
          <div className="mt-4">
            <p className="text-xs text-zinc-500 mb-2">Try downloading the file instead:</p>
            {fileUrl && (
              <a href={fileUrl} download className="primary-btn inline-flex items-center gap-2 text-sm">
                <Download className="h-4 w-4" /> Download {fileName}
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-4 py-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue" />
          <span className="text-sm text-zinc-300">{fileName || "Document"}</span>
          {numPages > 0 && (
            <span className="text-xs text-zinc-500">
              Page {pageNumber} of {numPages}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScale((s) => Math.max(0.5, s - 0.1))} className="ghost-btn p-1.5" title="Zoom out">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="text-xs text-zinc-400 min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(2.0, s + 0.1))} className="ghost-btn p-1.5" title="Zoom in">
            <ZoomIn className="h-4 w-4" />
          </button>
          {fileUrl && (
            <a href={fileUrl} download className="ghost-btn p-1.5" title="Download">
              <Download className="h-4 w-4" />
            </a>
          )}
          {onClose && (
            <button onClick={onClose} className="ghost-btn p-1.5 text-xs">Close</button>
          )}
        </div>
      </div>

      {/* Document */}
      <div className="flex justify-center bg-ink-900 p-4 max-h-[70vh] overflow-y-auto">
        <Document
          file={fileSource}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue/30 border-t-blue" />
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="shadow-glass"
          />
        </Document>
      </div>

      {/* Pagination */}
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-2 border-t border-white/10 bg-white/5 px-4 py-2">
          <button
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            className="ghost-btn text-xs px-3 py-1 disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-400">{pageNumber} / {numPages}</span>
          <button
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            className="ghost-btn text-xs px-3 py-1 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
