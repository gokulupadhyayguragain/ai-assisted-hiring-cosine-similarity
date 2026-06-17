"use client";

import { Award, Scale, BarChart3, Zap, Clock, Brain, UserCheck, AlertTriangle } from "lucide-react";

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

/** Detect tight clusters in the ranking and show tie-breaking strategies. */
export function TieBreakSummary({ candidates, threshold = 5 }: TieBreakSummaryProps) {
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
    <div className="glass-card overflow-hidden border-amber-500/20">
      <div className="border-b border-amber-500/10 bg-amber-500/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-semibold text-white">
            Tie-Breaking Analysis
          </h3>
          <span className="chip bg-amber-500/15 text-amber-500 text-[10px]">
            {ties.length} tight cluster{ties.length > 1 ? "s" : ""}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-zinc-500">
          {ties.length === 1
            ? `#${ties[0].a_idx + 1} and #${ties[0].b_idx + 1} are within ${threshold}% of each other`
            : `${ties.length} candidate pairs are close enough to need tie-breaking analysis`}
        </p>
      </div>

      <div className="divide-y divide-amber-500/5">
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
  const diff = Math.abs(a.score - b.score).toFixed(1);

  // Compute tie-breaker comparisons between the two candidates
  const strategies = computeStrategies(a, b);

  const aWins = strategies.filter((s) => s.winner === "a").length;
  const bWins = strategies.filter((s) => s.winner === "b").length;

  return (
    <div className="p-5">
      {/* Pair header */}
      <div className="mb-4 flex items-center justify-between rounded-xl bg-white/5 p-3">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-[10px] text-zinc-600 uppercase">Rank</p>
            <p className="text-lg font-bold text-blue">#{rankA}</p>
            <p className="text-xs text-zinc-400 truncate max-w-[120px]">{a.display_name || a.source_filename}</p>
          </div>
          <div className="flex flex-col items-center">
            <Scale className="h-4 w-4 text-zinc-600" />
            <p className="mt-1 text-xs text-zinc-500">Diff: {diff}%</p>
            <div className="mt-1 flex gap-1">
              <span className="chip bg-blue/15 text-blue text-[10px]">TF-IDF: {Math.round(a.tfidf_score)}%</span>
              <span className="chip bg-indigo-500/15 text-indigo-400 text-[10px]">Sem: {Math.round(a.semantic_score)}%</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-zinc-600 uppercase">Rank</p>
            <p className="text-lg font-bold text-indigo-400">#{rankB}</p>
            <p className="text-xs text-zinc-400 truncate max-w-[120px]">{b.display_name || b.source_filename}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Overall advantage</p>
          <p className="text-sm font-semibold text-white">
            {aWins > bWins ? `A leads ${aWins}-${bWins}` : bWins > aWins ? `B leads ${bWins}-${aWins}` : "Even"}
          </p>
        </div>
      </div>

      {/* Strategies grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {strategies.map((s) => (
          <div
            key={s.strategy}
            className={`rounded-xl border p-3 transition-all ${
              s.winner === "a"
                ? "border-blue/20 bg-blue/5"
                : s.winner === "b"
                ? "border-indigo-500/20 bg-indigo-500/5"
                : "border-zinc-500/20 bg-white/5"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <s.icon className={`h-3.5 w-3.5 ${s.iconColor}`} />
                <span className="text-[11px] font-medium text-zinc-300 truncate">{s.label}</span>
              </div>
              {s.winner !== "tie" && (
                <span className={`chip text-[9px] ${s.winner === "a" ? "bg-blue/15 text-blue" : "bg-indigo-500/15 text-indigo-400"}`}>
                  {s.winner === "a" ? `A: ${a.score.toFixed(1)}%` : `B: ${b.score.toFixed(1)}%`}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className={`font-semibold ${s.winner === "a" ? "text-blue" : "text-zinc-400"}`}>
                A: {typeof s.valA === "number" ? (Number.isInteger(s.valA) ? s.valA : s.valA.toFixed(1)) : s.valA}
              </span>
              <span className="text-zinc-600">vs</span>
              <span className={`font-semibold ${s.winner === "b" ? "text-indigo-400" : "text-zinc-400"}`}>
                B: {typeof s.valB === "number" ? (Number.isInteger(s.valB) ? s.valB : s.valB.toFixed(1)) : s.valB}
              </span>
            </div>
            <p className="mt-1 text-[10px] text-zinc-600 leading-tight">{s.reason}</p>
          </div>
        ))}
      </div>
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
      iconColor: "text-emerald-400",
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
      iconColor: "text-amber-500",
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
      iconColor: a.missing_skills.length < b.missing_skills.length ? "text-emerald-400" : "text-red-soft",
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
      iconColor: "text-indigo-400",
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
      iconColor: "text-indigo-400",
      valA: a.top_terms?.length ?? 0,
      valB: b.top_terms?.length ?? 0,
      reason: "Broader vocabulary of important terms = more comprehensive experience.",
    },
  ];
}
