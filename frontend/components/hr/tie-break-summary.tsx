"use client";

import { useState } from "react";
import { Award, Scale, BarChart3, Zap, Clock, Brain, UserCheck, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

interface CandidateSummary {
  candidate_id: string;
  display_name: string;
  source_filename: string;
  score: number;
  tfidf_score: number;
  semantic_score: number;
  matched_skills: string[];
  missing_skills: string[];
  experience_years: number | null;
  top_terms: string[];
}

interface TieBreakSummaryProps {
  candidates: CandidateSummary[];
  /** Score difference threshold (in percentage points) to consider a tie */
  threshold?: number;
}

/** Detect tight clusters in the ranking and show tie-breaking strategies.
 *  Collapsed by default to keep the rankings view clean — expand on demand. */
export function TieBreakSummary({ candidates, threshold = 5 }: TieBreakSummaryProps) {
  const [open, setOpen] = useState(false);

  if (candidates.length < 2) return null;

  // Find groups of candidates whose scores are within `threshold` points of each other
  const ties: Array<{ a_idx: number; b_idx: number }> = [];
  for (let i = 0; i < candidates.length - 1; i++) {
    const diff = Math.abs(candidates[i].score - candidates[i + 1].score);
    if (diff <= threshold) {
      ties.push({ a_idx: i, b_idx: i + 1 });
    }
  }

  if (ties.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-white shadow-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/50 px-5 py-3 text-left hover:bg-amber-50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Award className="h-5 w-5 text-amber-600 shrink-0" />
          <h3 className="text-sm font-semibold text-gray-900">Tie-Breaking Analysis</h3>
          <span className="chip bg-amber-100 text-amber-700 text-[10px]">
            {ties.length} tight pair{ties.length > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
          <span className="hidden sm:inline">{open ? "Hide" : "Review"}</span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {!open && (
        <div className="px-5 py-2.5 text-xs text-gray-500">
          {ties.length} candidate pair{ties.length > 1 ? "s are" : " is"} within {threshold}% of each other.
          Click to compare them across 6 dimensions.
        </div>
      )}

      {open && (
        <div className="divide-y divide-amber-50">
          {ties.map((tie) => {
            const a = candidates[tie.a_idx];
            const b = candidates[tie.b_idx];
            return (
              <TieBreakPair
                key={`${a.candidate_id}-${b.candidate_id}`}
                a={a}
                b={b}
                rankA={tie.a_idx + 1}
                rankB={tie.b_idx + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function TieBreakPair({
  a,
  b,
  rankA,
  rankB,
}: {
  a: CandidateSummary;
  b: CandidateSummary;
  rankA: number;
  rankB: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const diff = Math.abs(a.score - b.score).toFixed(1);

  // Compute tie-breaker comparisons between the two candidates
  const strategies = computeStrategies(a, b);

  const aWins = strategies.filter((s) => s.winner === "a").length;
  const bWins = strategies.filter((s) => s.winner === "b").length;
  const verdict = aWins > bWins ? `#${rankA} leads ${aWins}-${bWins}` : bWins > aWins ? `#${rankB} leads ${bWins}-${aWins}` : "Even split";

  return (
    <div className="p-4 sm:p-5">
      {/* Compact one-line pair row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3 text-left hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0 text-sm">
          <span className="font-bold text-blue shrink-0">#{rankA}</span>
          <Scale className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <span className="font-bold text-indigo-600 shrink-0">#{rankB}</span>
          <span className="text-gray-400 mx-1">·</span>
          <span className="text-xs text-gray-500 shrink-0">Diff {diff}%</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-gray-900">{verdict}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {/* Strategies grid — only when expanded */}
      {expanded && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {strategies.map((s) => (
            <div
              key={s.strategy}
              className={`rounded-xl border p-3 transition-all ${
                s.winner === "a"
                  ? "border-blue/20 bg-blue-light/50"
                  : s.winner === "b"
                  ? "border-indigo-200 bg-indigo-50/50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <s.icon className={`h-3.5 w-3.5 ${s.iconColor}`} />
                  <span className="text-[11px] font-medium text-gray-700 truncate">{s.label}</span>
                </div>
                {s.winner !== "tie" && (
                  <span className={`chip text-[9px] ${s.winner === "a" ? "bg-blue-light text-blue" : "bg-indigo-50 text-indigo-600"}`}>
                    {s.winner === "a" ? `#${rankA}` : `#${rankB}`}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className={`font-semibold ${s.winner === "a" ? "text-blue" : "text-gray-500"}`}>
                  #{rankA}: {typeof s.valA === "number" ? (Number.isInteger(s.valA) ? s.valA : s.valA.toFixed(1)) : s.valA}
                </span>
                <span className="text-gray-300">vs</span>
                <span className={`font-semibold ${s.winner === "b" ? "text-indigo-600" : "text-gray-500"}`}>
                  #{rankB}: {typeof s.valB === "number" ? (Number.isInteger(s.valB) ? s.valB : s.valB.toFixed(1)) : s.valB}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-gray-500 leading-tight">{s.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Strategy computation from candidate data
// ---------------------------------------------------------------------------

interface StrategyResult {
  strategy: string;
  label: string;
  winner: "a" | "b" | "tie";
  icon: React.ElementType;
  iconColor: string;
  valA: number;
  valB: number;
  reason: string;
}

function computeStrategies(a: CandidateSummary, b: CandidateSummary): StrategyResult[] {
  return [
    // 1. Semantic Depth: compare which has higher semantic score
    {
      strategy: "semantic_depth",
      label: "Semantic Depth",
      winner: a.semantic_score > b.semantic_score ? "a" : b.semantic_score > a.semantic_score ? "b" : "tie",
      icon: Brain,
      iconColor: "text-blue",
      valA: Math.round(a.semantic_score),
      valB: Math.round(b.semantic_score),
      reason: "Semantic embeddings capture conceptual understanding beyond keywords.",
    },
    // 2. TF-IDF advantage
    {
      strategy: "tfidf_depth",
      label: "TF-IDF Match",
      winner: a.tfidf_score > b.tfidf_score ? "a" : b.tfidf_score > a.tfidf_score ? "b" : "tie",
      icon: BarChart3,
      iconColor: "text-emerald-600",
      valA: Math.round(a.tfidf_score),
      valB: Math.round(b.tfidf_score),
      reason: "Keyword-level matching against the job description.",
    },
    // 3. Skill depth
    {
      strategy: "skill_depth",
      label: "Skill Count",
      winner: a.matched_skills.length > b.matched_skills.length ? "a" : b.matched_skills.length > a.matched_skills.length ? "b" : "tie",
      icon: Zap,
      iconColor: "text-amber-600",
      valA: a.matched_skills.length,
      valB: b.matched_skills.length,
      reason: "More matched skills = stronger domain coverage.",
    },
    // 4. Skill gap (missing skills — fewer is better)
    {
      strategy: "skill_gap",
      label: "Skill Gaps",
      winner: a.missing_skills.length < b.missing_skills.length ? "a" : b.missing_skills.length < a.missing_skills.length ? "b" : "tie",
      icon: AlertTriangle,
      iconColor: a.missing_skills.length < b.missing_skills.length ? "text-emerald-600" : "text-red",
      valA: a.missing_skills.length,
      valB: b.missing_skills.length,
      reason: "Fewer missing skills = better fit for the role.",
    },
    // 5. Experience
    {
      strategy: "experience",
      label: "Experience",
      winner: (a.experience_years ?? 0) > (b.experience_years ?? 0) ? "a" : (b.experience_years ?? 0) > (a.experience_years ?? 0) ? "b" : "tie",
      icon: Clock,
      iconColor: "text-indigo-600",
      valA: a.experience_years ?? 0,
      valB: b.experience_years ?? 0,
      reason: a.experience_years || b.experience_years
        ? "Years of relevant professional experience."
        : "No experience data extracted from resumes.",
    },
    // 6. Term breadth (top_terms count)
    {
      strategy: "term_breadth",
      label: "Term Breadth",
      winner: (a.top_terms?.length ?? 0) > (b.top_terms?.length ?? 0) ? "a" : (b.top_terms?.length ?? 0) > (a.top_terms?.length ?? 0) ? "b" : "tie",
      icon: UserCheck,
      iconColor: "text-indigo-600",
      valA: a.top_terms?.length ?? 0,
      valB: b.top_terms?.length ?? 0,
      reason: "Broader vocabulary of important terms = more comprehensive experience.",
    },
  ];
}
