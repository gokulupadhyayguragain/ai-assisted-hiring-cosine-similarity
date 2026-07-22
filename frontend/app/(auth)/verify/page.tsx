"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, MailCheck, Loader2, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

type Status = "idle" | "verifying" | "success" | "error";

function VerifyInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") || "";
  const linkToken = params.get("token") || "";
  const next = params.get("next") || "/login";

  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [resent, setResent] = useState(false);
  const autoRan = useRef(false);

  const submit = useCallback(
    async (body: { email: string; token?: string; code?: string }) => {
      setStatus("verifying");
      setMessage("");
      try {
        await apiFetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setStatus("success");
        setTimeout(() => router.replace(next), 1600);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Verification failed. Check the code and try again.");
      }
    },
    [router, next],
  );

  // Auto-verify when arriving from the email link (?token=...).
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    if (email && linkToken) submit({ email, token: linkToken });
  }, [email, linkToken, submit]);

  const onResend = useCallback(async () => {
    if (!email) return;
    try {
      await apiFetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch {
      /* ignore */
    }
  }, [email]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-light via-white to-red-light/30 p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-card text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue to-red text-white">
            {status === "success" ? <CheckCircle2 className="h-8 w-8" /> : <MailCheck className="h-8 w-8" />}
          </span>

          {status === "success" ? (
            <>
              <h1 className="mt-4 text-xl font-bold text-gray-900">Email verified!</h1>
              <p className="mt-1 text-sm text-gray-500">Redirecting you now…</p>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-xl font-bold text-gray-900">Verify your email</h1>
              <p className="mt-1 text-sm text-gray-500">
                We sent a 6-digit code{email ? <> to <span className="font-medium text-gray-700">{email}</span></> : null}.
                Enter it below, or click the link in the email.
              </p>

              <div className="mt-6 space-y-3">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 px-4 text-center text-2xl tracking-[0.5em] font-bold text-gray-900 placeholder:text-gray-300 focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/20"
                />
                {message && <p className="text-sm text-red">{message}</p>}
                <button
                  onClick={() => submit({ email, code })}
                  disabled={status === "verifying" || code.length !== 6 || !email}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-blue px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue/90 disabled:opacity-50"
                >
                  {status === "verifying" ? (<><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>) : "Verify Email"}
                </button>
                <button onClick={onResend} className="text-xs text-gray-500 hover:text-blue">
                  {resent ? "Verification email re-sent ✓" : "Didn't get it? Resend email"}
                </button>
              </div>

              <p className="mt-6 text-xs text-gray-400">
                Already verified?{" "}
                <Link href="/login" className="font-semibold text-blue hover:underline">Sign in</Link>
              </p>
            </>
          )}

          <div className="mt-4 flex justify-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600">
              <Brain className="h-3.5 w-3.5" /> AIHire
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyInner />
    </Suspense>
  );
}
