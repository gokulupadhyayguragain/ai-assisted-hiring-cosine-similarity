"use client";

import { Database } from "lucide-react";

export default function AdminDatabasePage() {
  return (
    <div className="space-y-6">
      <h1 className="display-title text-3xl text-white">Database</h1>
      <p className="text-sm text-zinc-400">Database management and migration tools.</p>
      <div className="glass-card p-12 text-center">
        <Database className="mx-auto h-10 w-10 text-zinc-600" />
        <p className="mt-3 text-sm text-zinc-500">Database tools coming soon.</p>
      </div>
    </div>
  );
}
