"use client";

import { BarChart3, TrendingUp, Users, Clock, Brain, FileSearch } from "lucide-react";

const stats = [
  { label: "Total Sessions", value: "—", change: "+0%", icon: BarChart3 },
  { label: "Candidates Scored", value: "—", change: "+0%", icon: Users },
  { label: "Avg. Score", value: "—", change: "—", icon: TrendingUp },
  { label: "Processing Time", value: "—", change: "—", icon: Clock },
];

const engineMetrics = [
  { label: "TF-IDF Accuracy", value: 92, color: "from-blue to-blue/50" },
  { label: "Semantic SBERT", value: 88, color: "from-red to-red/50" },
  { label: "Anonymization Rate", value: 100, color: "from-emerald-500 to-emerald-500/50" },
  { label: "Bias Detection", value: 85, color: "from-blue to-red" },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="display-title text-2xl md:text-3xl text-white">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-400">Screening session analytics and performance metrics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-5">
            <div className="flex items-center justify-between">
              <stat.icon className="h-5 w-5 text-blue" />
              <span className="text-xs text-emerald-400">{stat.change}</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-white">{stat.value}</p>
            <p className="mt-1 text-sm text-zinc-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">Engine Performance</h2>
          <Brain className="h-5 w-5 text-blue" />
        </div>
        <div className="mt-6 space-y-4">
          {engineMetrics.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-300">{item.label}</span>
                <span className="text-zinc-400">{item.value}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                  style={{ width: `${item.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card p-6 text-center">
        <FileSearch className="mx-auto h-8 w-8 text-zinc-500" />
        <p className="mt-3 text-sm text-zinc-400">
          Session data appears after running an AI screening via the API.
        </p>
      </div>
    </div>
  );
}
