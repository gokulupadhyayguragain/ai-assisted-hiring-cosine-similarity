"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Users, Brain, TrendingUp, Clock, Activity } from "lucide-react";

const usageData = [
  { month: "Jan", screenings: 12, users: 3 },
  { month: "Feb", screenings: 18, users: 5 },
  { month: "Mar", screenings: 25, users: 7 },
  { month: "Apr", screenings: 32, users: 9 },
  { month: "May", screenings: 41, users: 12 },
  { month: "Jun", screenings: 38, users: 11 },
];

const modelData = [
  { name: "BGE Small EN", calls: 1245, latency: 0.3 },
  { name: "TF-IDF", calls: 3200, latency: 0.05 },
  { name: "BM25", calls: 1800, latency: 0.08 },
];

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
        <p className="text-sm text-gray-500">Usage statistics and system performance.</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Screenings", value: "166", icon: Brain, color: "text-blue" },
          { label: "Active Users", value: "12", icon: Users, color: "text-emerald-600" },
          { label: "Avg Score", value: "67%", icon: TrendingUp, color: "text-indigo-600" },
          { label: "Uptime", value: "99.9%", icon: Activity, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <p className="mt-2 text-xl font-semibold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Screenings</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="screenings" stroke="#003893" strokeWidth={2} dot={{ fill: "#003893" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Model Performance</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={modelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="calls" fill="#003893" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
