-- AIHire Database Schema

-- Screening sessions from analysis engine
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

-- Internal job postings (created by HR)
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
    created_by TEXT NOT NULL DEFAULT 'recruiter',
    status TEXT NOT NULL DEFAULT 'draft'
);

CREATE INDEX IF NOT EXISTS idx_job_postings_created_at
    ON job_postings (created_at DESC);

-- Users (authentication)
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'candidate',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- External jobs imported from Adzuna, Greenhouse, etc.
CREATE TABLE IF NOT EXISTS external_jobs (
    job_id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT,
    location TEXT,
    description TEXT,
    url TEXT,
    salary_min REAL,
    salary_max REAL,
    salary_currency TEXT DEFAULT 'USD',
    salary_period TEXT DEFAULT 'yearly',
    required_skills JSONB DEFAULT '[]'::jsonb,
    department TEXT,
    experience TEXT,
    employment_type TEXT,
    posted_at TEXT,
    expires_at TEXT,
    remote BOOLEAN DEFAULT FALSE,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_data JSONB DEFAULT '{}'::jsonb,
    UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_external_jobs_source ON external_jobs(source);
CREATE INDEX IF NOT EXISTS idx_external_jobs_title ON external_jobs(title);
CREATE INDEX IF NOT EXISTS idx_external_jobs_imported_at ON external_jobs(imported_at DESC);

-- Audit log for tracking actions
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
