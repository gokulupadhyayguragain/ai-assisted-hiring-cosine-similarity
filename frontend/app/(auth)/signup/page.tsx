"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, Mail, Lock, User as UserIcon, Building2, GraduationCap, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { API_BASE } from "@/lib/api";

type Role = "candidate" | "recruiter";

const googleSignupUrl = (role: Role) =>
  `${API_BASE}/api/v1/auth/google/login?mode=signup&role=${role}`;

const ROLES: { id: Role; title: string; desc: string; icon: typeof Building2 }[] = [
  { id: "candidate", title: "Candidate / Student", desc: "Find jobs & check your fit", icon: GraduationCap },
  { id: "recruiter", title: "Recruiter / HR", desc: "Post jobs & screen candidates", icon: Building2 },
];

function GoogleButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="w-full flex items-center justify-center gap-3 rounded-full border-2 border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
      </svg>
      {label}
    </a>
  );
}

function SignupForm() {
  const router = useRouter();
  const { signup, loading } = useAuth();
  const [role, setRole] = useState<Role>("candidate");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      try {
        const user = await signup(email, password, name, role);
        // Email sent — let the user verify, but route them onward in the meantime.
        router.push(`/verify?email=${encodeURIComponent(user.email)}&next=${encodeURIComponent("/role-selection")}`);
      } catch (err: any) {
        setError(err.message || "Sign-up failed. Please try again.");
      }
    },
    [email, password, name, role, signup, router],
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-light via-white to-red-light/30 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-card">
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue to-red text-white shadow-sm">
                <Brain className="h-6 w-6" />
              </span>
              <span className="font-display text-xl font-bold tracking-wide text-gray-900">AIHire</span>
            </Link>
            <h1 className="mt-4 text-xl font-bold text-gray-900">Create your account</h1>
            <p className="mt-1 text-sm text-gray-500">Choose how you&apos;ll use AIHire</p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red text-center mb-4">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-5">
            {ROLES.map((r) => {
              const active = role === r.id;
              return (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-all ${
                    active ? "border-blue bg-blue-light/50 ring-2 ring-blue/20" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <r.icon className={`h-5 w-5 ${active ? "text-blue" : "text-gray-400"}`} />
                  <span className="text-xs font-semibold text-gray-900">{r.title}</span>
                  <span className="text-[10px] text-gray-500">{r.desc}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="relative">
              <UserIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                placeholder="Full name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                placeholder="Email address"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password (min. 6 characters)"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-blue px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue/90 disabled:opacity-50"
            >
              {loading ? "Creating account…" : (<><UserPlus className="h-4 w-4" /> Create Account</>)}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">or</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <GoogleButton href={googleSignupUrl(role)} label={`Sign up with Google as ${role === "recruiter" ? "Recruiter" : "Candidate"}`} />

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-blue hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
