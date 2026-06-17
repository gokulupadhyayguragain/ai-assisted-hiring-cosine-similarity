"use client";

import { FileSearch } from "lucide-react";

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="display-title text-3xl text-white">Reports</h1>
      <p className="text-sm text-zinc-400">Generate and view platform reports.</p>
      <div className="glass-card p-12 text-center">
        <FileSearch className="mx-auto h-10 w-10 text-zinc-600" />
        <p className="mt-3 text-sm text-zinc-500">Reports coming soon.</p>
      </div>
    </div>
  );
}
