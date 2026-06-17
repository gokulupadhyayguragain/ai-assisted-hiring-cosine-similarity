"use client";

import { useState, useEffect } from "react";
import { Server, Users, Database, Brain, BarChart3, Activity } from "lucide-react";
import { apiUrl } from "@/lib/api";

export default function AdminDashboard() {
  const [health, setHealth] = useState<{ status: string; semantic_enabled: boolean; semantic_model: string } | null>(null);

  useEffect(() => {
    fetch(apiUrl("/health"))
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const stats = [
    { label: "Active Users", value: "—", icon: Users, color: "text-blue" },
    { label: "Models Deployed", value: health?.semantic_enabled ? "1" : "0", icon: Server, color: "text-emerald-400" },
    { label: "Screening Sessions", value: "—", icon: Brain, color: "text-indigo-400" },
    { label: "System Status", value: health?.status ?? "Unknown", icon: Activity, color: "text-red-soft" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-title text-3xl text-white">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">Platform overview and system management.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="mt-3 text-2xl font-semibold text-white">{stat.value}</p>
            <p className="text-xs text-zinc-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* System Info */}
      <div className="glass-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Server className="h-5 w-5 text-blue" />
          System Configuration
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-xs text-zinc-500">Semantic Engine</p>
            <p className="mt-1 text-sm font-medium text-white">
              {health?.semantic_enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-xs text-zinc-500">Active Model</p>
            <p className="mt-1 text-sm font-medium text-white">
              {health?.semantic_model ?? "N/A"}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-xs text-zinc-500">Backend</p>
            <p className="mt-1 text-sm font-medium text-white">
              {health?.status === "ok" ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-400" /> Operational
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" /> Offline
                </span>
              )}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-xs text-zinc-500">Database</p>
            <p className="mt-1 text-sm font-medium text-white">PostgreSQL</p>
          </div>
        </div>
      </div>
    </div>
  );
}
