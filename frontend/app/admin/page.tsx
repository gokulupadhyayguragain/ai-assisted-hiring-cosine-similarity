"use client";

import { useState, useEffect } from "react";
import { Server, Users, Brain, Activity } from "lucide-react";
import { apiUrl } from "@/lib/api";

export default function AdminDashboard() {
  const [health, setHealth] = useState<{
    status: string;
    semantic_enabled: boolean;
    semantic_model: string;
  } | null>(null);

  useEffect(() => {
    fetch(apiUrl("/health"))
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const stats = [
    { label: "Active Users", value: "—", icon: Users, color: "text-blue" },
    {
      label: "Models Deployed",
      value: health?.semantic_enabled ? "1" : "0",
      icon: Server,
      color: "text-emerald-600",
    },
    {
      label: "Screening Sessions",
      value: "—",
      icon: Brain,
      color: "text-indigo-600",
    },
    {
      label: "System Status",
      value: health?.status ?? "Unknown",
      icon: Activity,
      color: health?.status === "ok" ? "text-emerald-600" : "text-red",
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform overview and system management.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-card"
          >
            <div className="flex items-center justify-between">
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <p className="mt-3 text-xl sm:text-2xl font-semibold text-gray-900">
              {stat.value}
            </p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* System Info */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Server className="h-5 w-5 text-blue" />
          System Configuration
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs text-gray-500">Semantic Engine</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {health?.semantic_enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs text-gray-500">Active Model</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {health?.semantic_model ?? "N/A"}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs text-gray-500">Backend</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {health?.status === "ok" ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />{" "}
                  Operational
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red" /> Offline
                </span>
              )}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-xs text-gray-500">Database</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              PostgreSQL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
