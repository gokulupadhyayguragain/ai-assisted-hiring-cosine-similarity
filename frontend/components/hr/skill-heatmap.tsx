"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { CheckCircle, XCircle, TrendingUp } from "lucide-react";

interface SkillHeatmapProps {
  matchedSkills: string[];
  missingSkills: string[];
  inferredSkills?: string[];
  className?: string;
}

export function SkillHeatmap({
  matchedSkills,
  missingSkills,
  inferredSkills = [],
  className = "",
}: SkillHeatmapProps) {
  const allSkills = [...new Set([...matchedSkills, ...missingSkills, ...inferredSkills])];
  const topSkills = allSkills.slice(0, 12);

  const radarData = topSkills.map((skill) => {
    const matched = matchedSkills.includes(skill);
    const inferred = inferredSkills.includes(skill);
    const level = matched ? 90 : inferred ? 60 : 20;
    return { skill: skill.length > 10 ? skill.slice(0, 10) + "…" : skill, level };
  });

  const matchRate = matchedSkills.length
    ? Math.round(
        (matchedSkills.length /
          (matchedSkills.length + missingSkills.length)) *
          100
      )
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Score Summary */}
      <div className="grid gap-4 grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">
            {matchedSkills.length}
          </p>
          <p className="text-xs text-emerald-700 font-medium mt-0.5">
            Matched
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-light p-4 text-center">
          <p className="text-2xl font-bold text-red">{missingSkills.length}</p>
          <p className="text-xs text-red font-medium mt-0.5">Gaps</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">
            {matchRate}%
          </p>
          <p className="text-xs text-indigo-700 font-medium mt-0.5">
            Match Rate
          </p>
        </div>
      </div>

      {/* Radar Chart */}
      {radarData.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e4e4e7" />
              <PolarAngleAxis
                dataKey="skill"
                tick={{ fontSize: 10, fill: "#71717a" }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 9 }}
              />
              <Radar
                name="Skill Match"
                dataKey="level"
                stroke="#003893"
                fill="#003893"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e4e4e7",
                  background: "white",
                  fontSize: 12,
                }}
                formatter={(value: any) => [`${value}%`, "Match Level"]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Skill Lists */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Matched Skills */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mb-2 uppercase tracking-wider">
            <CheckCircle className="h-3.5 w-3.5" />
            Matched Skills ({matchedSkills.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {matchedSkills.length > 0 ? (
              matchedSkills.map((skill) => (
                <span
                  key={skill}
                  className="chip bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-xs text-gray-400">No skills matched</p>
            )}
          </div>
        </div>

        {/* Missing Skills */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-red uppercase tracking-wider mb-2">
            <XCircle className="h-3.5 w-3.5" />
            Skill Gaps ({missingSkills.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {missingSkills.length > 0 ? (
              missingSkills.map((skill) => (
                <span
                  key={skill}
                  className="chip bg-red-light text-red border border-red-200"
                >
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-xs text-gray-400">No gaps identified</p>
            )}
          </div>
        </div>
      </div>

      {/* Inferred Skills */}
      {inferredSkills.length > 0 && (
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
            <TrendingUp className="h-3.5 w-3.5" />
            Inferred Skills ({inferredSkills.length})
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {inferredSkills.map((skill) => (
              <span
                key={skill}
                className="chip bg-indigo-50 text-indigo-700 border border-indigo-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
