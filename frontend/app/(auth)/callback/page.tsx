"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Brain, Loader2 } from "lucide-react";
import { useAuth, dashboardPath } from "@/lib/auth";

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { setSession } = useAuth();
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = params.get("token");
    const role = params.get("role") || "candidate";
    if (!token) {
      setError("Missing sign-in token.");
      setTimeout(() => router.replace("/login?error=google_failed"), 1500);
      return;
    }
    setSession(token)
      .then((user) => {
        if (user.role === "admin") {
          router.replace("/admin");
        } else {
          router.replace(`/role-selection?next=${encodeURIComponent(dashboardPath(user.role || role))}`);
        }
      })
      .catch(() => {
        setError("Could not complete sign-in.");
        setTimeout(() => router.replace("/login?error=google_failed"), 1500);
      });
  }, [params, router, setSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-light via-white to-red-light/30 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue to-red text-white">
          <Brain className="h-8 w-8" />
        </span>
        {error ? (
          <p className="mt-6 text-sm text-red">{error}</p>
        ) : (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Signing you in…
          </p>
        )}
      </motion.div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
