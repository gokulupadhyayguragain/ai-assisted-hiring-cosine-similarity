"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Mail, LogIn, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

const field =
  "w-full rounded-xl bg-white/5 border border-white/10 py-3 pl-11 pr-4 text-white placeholder:text-zinc-500 focus-ring transition";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    // Simulate auth — in production, call the backend API
    await new Promise((r) => setTimeout(r, 800));

    if (email === "admin@aihire.com" && password === "admin123") {
      router.replace("/admin");
    } else {
      setError("Invalid email or password. Try admin@aihire.com / admin123");
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 p-5">
      {/* Background spotlight */}
      <div className="spotlight-radial pointer-events-none absolute inset-0" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong relative z-10 w-full max-w-md rounded-3xl p-8"
      >
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue to-red text-white">
            <Brain className="h-8 w-8" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold text-white">AIHire</h1>
          <p className="mt-1 text-sm text-zinc-400">Sign in to the admin dashboard</p>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-red/10 px-3 py-2 text-sm text-red-soft">{error}</p>
        )}

        <AnimatePresence mode="wait">
          <motion.form
            key="signin"
            onSubmit={onSignIn}
            className="space-y-4"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
          >
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                name="email"
                type="email"
                required
                placeholder="Email address"
                className={field}
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                name="password"
                type="password"
                required
                placeholder="Password"
                className={field}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {busy ? "Signing in…" : <><LogIn className="h-4 w-4" /> Sign In</>}
            </Button>
          </motion.form>
        </AnimatePresence>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Demo: admin@aihire.com / admin123
        </p>
      </motion.div>
    </div>
  );
}
