export type BiasFinding = {
  term: string;
  category: string;
  severity: "low" | "medium" | "high";
  suggestion: string;
};

export type CandidateResult = {
  candidate_id: string;
  display_name: string;
  source_filename: string;
  score: number;
  tfidf_score: number;
  semantic_score: number;
  matched_skills: string[];
  inferred_skills: string[];
  missing_skills: string[];
  top_terms: string[];
  experience_years: number | null;
  summary: string;
  suggestions: string[];
  anonymization: Record<string, number>;
  extraction_warnings: string[];
};

export type AnalysisSession = {
  session_id: string;
  created_at: string;
  job_skills: string[];
  bias_audit: {
    score: number;
    findings: BiasFinding[];
  };
  candidates: CandidateResult[];
  processing_ms: number;
  engine: {
    tfidf_weight: number;
    semantic_weight: number;
    semantic_model: string;
    semantic_enabled: boolean;
    anonymization: string;
  };
  role: "recruiter" | "job-seeker";
};
