"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Brain, Building2, Check, GraduationCap, Loader2 } from "lucide-react";
import { useAuth, dashboardPath } from "@/lib/auth";
import type { UserRole } from "@/lib/auth";

type SelfServiceRole = "candidate" | "recruiter";

const OPTIONS: {
  role: SelfServiceRole;
  title: string;
  description: string;
  detail: string;
  icon: typeof GraduationCap;
}[] = [
  {
    role: "candidate",
    title: "Candidate",
    description: "Build and optimize your CV, find jobs, and understand your skill gaps.",
    detail: "Candidate portal",
    icon: GraduationCap,
  },
  {
    role: "recruiter",
    title: "HR",
    description: "Manage jobs, upload resumes, and screen candidates fairly with AI.",
    detail: "HR workspace",
    icon: Building2,
  },
];

function RoleSelectionInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, setRole, loading } = useAuth();
  const [selected, setSelected] = useState<SelfServiceRole>(
    user?.role === "recruiter" ? "recruiter" : "candidate",
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "admin") {
      router.replace("/admin");
      return;
    }
    if (user.role === "recruiter" || user.role === "candidate") {
      setSelected(user.role);
    }
  }, [router, user]);

  const confirm = async () => {
    setError("");
    try {
      const updated = await setRole(selected);
      const requestedNext = params.get("next") || "";
      const safeNext = requestedNext.startsWith("/") ? requestedNext : dashboardPath(updated.role as UserRole);
      // Role selection always controls the workspace. Do not send a candidate
      // to an HR-only path (or vice versa) from a stale query parameter.
      const destination = selected === "recruiter" ? "/hr" : "/candidate";
      router.replace(safeNext === "/hr" || safeNext === "/candidate" ? destination : dashboardPath(updated.role));
    } catch (err: any) {
      setError(err.message || "Could not save your workspace choice.");
    }
  };

  if (!user) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-light via-white to-red-light/30 p-4">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue to-red text-white shadow-sm">
            <Brain className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-gray-900">Choose your AIHire workspace</h1>
          <p className="mt-2 text-sm text-gray-500">You can change this workspace any time after signing in.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = selected === option.role;
            return (
              <button
                key={option.role}
                type="button"
                onClick={() => setSelected(option.role)}
                className={`relative rounded-2xl border-2 bg-white p-6 text-left transition-all hover:-translate-y-0.5 hover:shadow-card ${
                  active ? "border-blue bg-blue-light/40 shadow-card" : "border-gray-200"
                }`}
              >
                {active && <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-blue text-white"><Check className="h-4 w-4" /></span>}
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${active ? "bg-blue text-white" : "bg-gray-100 text-gray-500"}`}>
                  <Icon className="h-6 w-6" />
                </span>
                <h2 className="mt-5 text-lg font-bold text-gray-900">{option.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">{option.description}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-blue">{option.detail}</p>
              </button>
            );
          })}
        </div>

        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-center text-sm text-red">{error}</p>}
        <button onClick={confirm} disabled={loading} className="primary-btn mt-6 w-full justify-center">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving workspace...</> : <>Continue as {selected === "recruiter" ? "HR" : "Candidate"}</>}
        </button>
      </motion.div>
    </main>
  );
}

export default function RoleSelectionPage() {
  return <Suspense fallback={null}><RoleSelectionInner /></Suspense>;
}
