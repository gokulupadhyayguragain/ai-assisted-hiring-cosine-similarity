"use client";

import { ShieldCheck } from "lucide-react";

export default function AdminAuditsPage() {
  return (
    <div className="space-y-6">
      <h1 className="display-title text-3xl text-white">Audit Logs</h1>
      <p className="text-sm text-zinc-400">System audit trail and compliance logs.</p>
      <div className="glass-card p-12 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-zinc-600" />
        <p className="mt-3 text-sm text-zinc-500">Audit logs coming soon.</p>
      </div>
    </div>
  );
}
