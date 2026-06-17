"use client";

import { Settings } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="display-title text-3xl text-white">System Settings</h1>
      <p className="text-sm text-zinc-400">Platform configuration and preferences.</p>
      <div className="glass-card p-12 text-center">
        <Settings className="mx-auto h-10 w-10 text-zinc-600" />
        <p className="mt-3 text-sm text-zinc-500">Settings page coming soon.</p>
      </div>
    </div>
  );
}
