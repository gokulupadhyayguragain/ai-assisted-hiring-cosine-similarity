/** Base URL for the backend API. Configurable via env var, falls back to localhost. */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

/** Convenience wrapper for fetch with proper error handling. */
export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, options);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(detail.detail || `Request failed: ${res.status}`);
  }
  // If the response is binary (PDF, CSV, blob), return raw response
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/pdf") || contentType.includes("text/csv") || contentType.includes("application/octet-stream")) {
    return res as unknown as T;
  }
  return res.json() as Promise<T>;
}

/** Build a full API URL for direct links (downloads, previews, etc). */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
