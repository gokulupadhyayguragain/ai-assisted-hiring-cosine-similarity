"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Briefcase,
  Users,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const STEPS = [
  { id: "company", icon: Building2, title: "Company Details" },
  { id: "industry", icon: Briefcase, title: "Industry" },
  { id: "team", icon: Users, title: "Your Team" },
  { id: "complete", icon: PartyPopper, title: "All Set!" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    companyName: "",
    website: "",
    industry: "technology",
    teamSize: "1-10",
    hiringVolume: "1-5",
    role: "hr-manager",
  });

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const total = STEPS.length;
  const progress = ((step + 1) / total) * 100;

  const next = () => {
    if (step < total - 1) setStep((s) => s + 1);
  };
  const prev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-light/30 via-white to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className="flex flex-col items-center"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                    i <= step
                      ? "bg-gradient-to-br from-blue to-blue-soft text-white shadow-glow"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {i < step ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <s.icon className="h-4 w-4" />
                  )}
                </div>
                <span className="hidden sm:block text-[10px] mt-1 text-gray-500 font-medium">
                  {s.title}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue to-blue-soft rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-card min-h-[340px]">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="company"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-light text-blue">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Tell us about your company
                    </h2>
                    <p className="text-xs text-gray-500">
                      We&apos;ll personalize your experience.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium">
                    Company Name
                  </label>
                  <input
                    className="field mt-1"
                    placeholder="Acme Corp"
                    value={form.companyName}
                    onChange={(e) => update("companyName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium">
                    Website
                  </label>
                  <input
                    className="field mt-1"
                    placeholder="https://acme.com"
                    value={form.website}
                    onChange={(e) => update("website", e.target.value)}
                  />
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="industry"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Briefcase className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      What industry are you in?
                    </h2>
                    <p className="text-xs text-gray-500">
                      Helps us tailor skill matching.
                    </p>
                  </div>
                </div>
                {[
                  { id: "technology", label: "Technology / IT" },
                  { id: "finance", label: "Finance / Banking" },
                  { id: "healthcare", label: "Healthcare" },
                  { id: "education", label: "Education" },
                  { id: "ecommerce", label: "E-commerce / Retail" },
                  { id: "other", label: "Other" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => update("industry", opt.id)}
                    className={`option-card ${
                      form.industry === opt.id
                        ? "border-blue/40 bg-blue-light/50"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div
                        className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                          form.industry === opt.id
                            ? "border-blue"
                            : "border-gray-300"
                        }`}
                      >
                        {form.industry === opt.id && (
                          <div className="h-2 w-2 rounded-full bg-blue" />
                        )}
                      </div>
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="team"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <Users className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Tell us about your team
                    </h2>
                    <p className="text-xs text-gray-500">
                      Helps us recommend the right workflow.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium">
                    Team Size
                  </label>
                  <select
                    className="field mt-1"
                    value={form.teamSize}
                    onChange={(e) => update("teamSize", e.target.value)}
                  >
                    <option value="1-10">1–10 employees</option>
                    <option value="11-50">11–50 employees</option>
                    <option value="51-200">51–200 employees</option>
                    <option value="201+">201+ employees</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium">
                    Monthly Hiring Volume
                  </label>
                  <select
                    className="field mt-1"
                    value={form.hiringVolume}
                    onChange={(e) => update("hiringVolume", e.target.value)}
                  >
                    <option value="1-5">1–5 positions</option>
                    <option value="6-20">6–20 positions</option>
                    <option value="21-50">21–50 positions</option>
                    <option value="50+">50+ positions</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600 font-medium">
                    Your Role
                  </label>
                  <select
                    className="field mt-1"
                    value={form.role}
                    onChange={(e) => update("role", e.target.value)}
                  >
                    <option value="hr-manager">HR Manager</option>
                    <option value="recruiter">Recruiter</option>
                    <option value="hiring-manager">Hiring Manager</option>
                    <option value="founder">Founder / CEO</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center text-center py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 15,
                    delay: 0.2,
                  }}
                >
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue to-red text-white shadow-glow">
                    <PartyPopper className="h-10 w-10" />
                  </span>
                </motion.div>
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mt-6 text-2xl font-bold text-gray-900"
                >
                  You&apos;re all set!
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-2 text-sm text-gray-500 max-w-sm"
                >
                  Welcome to AIHire. Start creating job postings, uploading
                  resumes, and screening candidates with AI-powered fairness.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-8 flex gap-3"
                >
                  <Button onClick={() => router.push("/hr")} size="lg">
                    Go to HR Dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        {step < total - 1 && (
          <div className="flex items-center justify-between mt-6">
            <button
              onClick={prev}
              disabled={step === 0}
              className="ghost-btn text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              onClick={next}
              className="primary-btn text-sm"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
