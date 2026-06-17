export type JobRecord = {
  job_id: string;
  created_at: string;
  updated_at: string;
  title: string;
  department: string;
  experience: string;
  location: string;
  salary: string;
  required_skills: string[];
  description: string;
  created_by: string;
};

export type JobDraft = {
  title: string;
  department: string;
  experience: string;
  location: string;
  salary: string;
  skills: string;
  description: string;
};

const key = "recruiter.jobDraft";

export function loadDraft(): JobDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as JobDraft) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: JobDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(draft));
}
