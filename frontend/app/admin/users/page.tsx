"use client";

import { useState } from "react";
import { UserRound, ShieldCheck, Ban, CheckCircle, Search } from "lucide-react";

const MOCK_USERS = [
  { id: "1", name: "Gokul Guragain", email: "gokul@example.com", role: "Admin", status: "active", lastActive: "2 hours ago" },
  { id: "2", name: "HR Team", email: "hr@acme.com", role: "HR Manager", status: "active", lastActive: "5 min ago" },
  { id: "3", name: "Recruiter A", email: "recruiter.a@acme.com", role: "Recruiter", status: "active", lastActive: "1 day ago" },
  { id: "4", name: "Recruiter B", email: "recruiter.b@acme.com", role: "Recruiter", status: "inactive", lastActive: "2 weeks ago" },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const filtered = MOCK_USERS.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">Manage platform users and permissions.</p>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input className="field pl-9 text-sm" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <th className="p-4 font-semibold">User</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold">Last Active</th>
              <th className="p-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-light text-blue text-xs font-bold">{u.name[0]}</div>
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-gray-600">{u.role}</td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {u.status === "active" ? <CheckCircle className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                    {u.status}
                  </span>
                </td>
                <td className="p-4 text-xs text-gray-500">{u.lastActive}</td>
                <td className="p-4">
                  <button className="text-xs text-blue hover:underline">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
