"use client";

import { PropsWithChildren } from "react";

export function SkeletonCard() {
  return <div className="h-24 animate-pulse rounded-2xl border border-gray-200 bg-gray-100" />;
}

export function Modal({
  open,
  title,
  onClose,
  children
}: PropsWithChildren<{
  open: boolean;
  title: string;
  onClose: () => void;
}>) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button type="button" className="ghost-btn" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
