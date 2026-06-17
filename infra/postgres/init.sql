CREATE TABLE IF NOT EXISTS screening_sessions (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    role TEXT NOT NULL,
    job_skills JSONB NOT NULL,
    bias_audit JSONB NOT NULL,
    candidates JSONB NOT NULL,
    engine JSONB NOT NULL,
    processing_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_screening_sessions_created_at
    ON screening_sessions (created_at DESC);

CREATE TABLE IF NOT EXISTS job_postings (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    experience TEXT NOT NULL,
    location TEXT NOT NULL,
    salary TEXT NOT NULL,
    required_skills JSONB NOT NULL,
    description TEXT NOT NULL,
    created_by TEXT NOT NULL DEFAULT 'recruiter'
);

CREATE INDEX IF NOT EXISTS idx_job_postings_created_at
    ON job_postings (created_at DESC);
