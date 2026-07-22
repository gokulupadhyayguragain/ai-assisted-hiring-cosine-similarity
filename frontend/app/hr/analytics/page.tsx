"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  TrendingUp,
  Users,
  Brain,
  Clock,
  RefreshCw,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

const matchDistData = [
  { range: "0-20%", count: 2 },
  { range: "20-40%", count: 5 },
  { range: "40-60%", count: 12 },
  { range: "60-80%", count: 8 },
  { range: "80-100%", count: 3 },
];

const skillData = [
  { skill: "Python", count: 18 },
  { skill: "JavaScript", count: 15 },
  { skill: "React", count: 12 },
  { skill: "Node.js", count: 10 },
  { skill: "SQL", count: 9 },
  { skill: "TypeScript", count: 8 },
  { skill: "Docker", count: 7 },
  { skill: "AWS", count: 6 },
];

const trendData = [
  { month: "Jan", screenings: 4, candidates: 12 },
  { month: "Feb", screenings: 7, candidates: 24 },
  { month: "Mar", screenings: 5, candidates: 18 },
  { month: "Apr", screenings: 9, candidates: 32 },
  { month: "May", screenings: 11, candidates: 45 },
  { month: "Jun", screenings: 8, candidates: 28 },
];

const radarData = [
  { skill: "Technical", expected: 90, actual: 75 },
  { skill: "Experience", expected: 80, actual: 65 },
  { skill: "Education", expected: 70, actual: 80 },
  { skill: "Leadership", expected: 60, actual: 45 },
  { skill: "Communication", expected: 75, actual: 70 },
  { skill: "Culture Fit", expected: 65, actual: 60 },
];

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiUrl("/api/sessions?limit=50"))
      .then((r) => r.json())
      .then((d) => {
        setSessions(d.sessions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const totalCandidates = sessions.reduce(
    (sum, s) => sum + (s.candidates?.length ?? 0),
    0
  );
  const avgScore = sessions.length
    ? (
        sessions.reduce((sum, s) => {
          const scores = (s.candidates ?? []).map((c: any) => c.score ?? 0);
          return sum + (scores.reduce((a: number, b: number) => a + b, 0) / (scores.length || 1));
        }, 0) / sessions.length *
        100
      ).toFixed(1)
    : "—";

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Screening insights, match distributions, and skill trends.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="ghost-btn text-sm px-3 py-2"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Sessions", value: sessions.length, icon: Brain, color: "text-blue" },
          { label: "Candidates Screened", value: totalCandidates, icon: Users, color: "text-emerald-600" },
          { label: "Avg Match Score", value: `${avgScore}%`, icon: TrendingUp, color: "text-indigo-600" },
          { label: "Avg Processing", value: "2.3s", icon: Clock, color: "text-amber-600" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-card"
          >
            <div className="flex items-center justify-between">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
            </div>
            <p className="mt-3 text-xl sm:text-2xl font-semibold text-gray-900">
              {kpi.value}
            </p>
            <p className="text-xs text-gray-500">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Match Distribution */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Match Score Distribution
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={matchDistData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e4e4e7",
                  background: "white",
                }}
              />
              <Bar dataKey="count" fill="#003893" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Screening Trend */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Screening Activity
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e4e4e7",
                  background: "white",
                }}
              />
              <Line
                type="monotone"
                dataKey="screenings"
                stroke="#003893"
                strokeWidth={2}
                dot={{ fill: "#003893", r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="candidates"
                stroke="#CE1126"
                strokeWidth={2}
                dot={{ fill: "#CE1126", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Skills */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Most Common Skills
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={skillData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="skill"
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e4e4e7",
                  background: "white",
                }}
              />
              <Bar dataKey="count" fill="#1a5bbf" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Skill Radar */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Candidate Profile Radar
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e4e4e7" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fontSize: 11, fill: "#71717a" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
              />
              <Radar
                name="Required"
                dataKey="expected"
                stroke="#003893"
                fill="#003893"
                fillOpacity={0.1}
              />
              <Radar
                name="Candidate"
                dataKey="actual"
                stroke="#CE1126"
                fill="#CE1126"
                fillOpacity={0.1}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e4e4e7",
                  background: "white",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-blue" /> Required
            </span>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="h-2 w-2 rounded-full bg-red" /> Candidate
            </span>
          </div>
        </div>
      </div>

      {/* Recent Sessions Table */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-card">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Recent Screening Sessions
        </h3>
        {sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase">
                  <th className="pb-2 font-semibold">Session</th>
                  <th className="pb-2 font-semibold">Candidates</th>
                  <th className="pb-2 font-semibold">Avg Score</th>
                  <th className="pb-2 font-semibold">Role</th>
                  <th className="pb-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 10).map((s: any) => {
                  const scores = (s.candidates ?? []).map((c: any) => c.score ?? 0);
                  const avg = scores.length
                    ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length * 100).toFixed(1)
                    : "—";
                  return (
                    <tr key={s.session_id} className="border-b border-gray-50">
                      <td className="py-2.5 font-medium text-gray-900">
                        {s.session_id?.slice(0, 8)}…
                      </td>
                      <td className="py-2.5 text-gray-600">
                        {s.candidates?.length ?? 0}
                      </td>
                      <td className="py-2.5 text-gray-600">{avg}%</td>
                      <td className="py-2.5">
                        <span className="chip text-[10px] bg-blue-light text-blue">
                          {s.role}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-500 text-xs">
                        {s.created_at
                          ? new Date(s.created_at).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-4 text-center">
            {loading ? "Loading..." : "No screening sessions yet. Run your first screening to see analytics."}
          </p>
        )}
      </div>
    </div>
  );
}
