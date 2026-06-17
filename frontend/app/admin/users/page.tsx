"use client";

import { Users } from "lucide-react";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="display-title text-3xl text-white">User Management</h1>
      <p className="text-sm text-zinc-400">Manage platform users, roles, and permissions.</p>
      <div className="glass-card p-12 text-center">
        <Users className="mx-auto h-10 w-10 text-zinc-600" />
        <p className="mt-3 text-sm text-zinc-500">User management coming soon.</p>
      </div>
    </div>
  );
}
