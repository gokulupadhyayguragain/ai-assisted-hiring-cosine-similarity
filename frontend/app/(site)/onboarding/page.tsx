"use client";

import { Check, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const steps = ["Company", "Industry", "Hiring Volume", "Team", "Finish"];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [company, setCompany] = useState("");
  const [industry, setIndustry] = useState("IT Services");
  const [volume, setVolume] = useState("1-10 jobs/month");
  const [team, setTeam] = useState("2-5 recruiters");

  const progress = useMemo(() => ((step + 1) / steps.length) * 100, [step]);

  function next() {
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function prev() {
    setStep((current) => Math.max(current - 1, 0));
  }

  return (
      <section className="mx-auto max-w-3xl px-4 py-8">
        <div className="glass rounded-3xl border border-white/10 p-6 md:p-10">
          <p className="text-sm uppercase tracking-[0.28em] text-blue">Onboarding</p>
          <h1 className="mt-2 text-3xl font-semibold">Set your hiring workspace</h1>
          <p className="mt-2 text-sm text-slate-300">One clean step at a time. No clutter, no skipped context.</p>

          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-blue to-red transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-8 space-y-6">
            {step === 0 && (
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Company name</span>
                <input className="field" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Acme Tech Pvt. Ltd." />
              </label>
            )}

            {step === 1 && (
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Industry</span>
                <select className="field" value={industry} onChange={(event) => setIndustry(event.target.value)}>
                  <option>IT Services</option>
                  <option>Product Development</option>
                  <option>FinTech</option>
                  <option>AI/ML</option>
                  <option>EdTech</option>
                </select>
              </label>
            )}

            {step === 2 && (
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Monthly hiring volume</span>
                <select className="field" value={volume} onChange={(event) => setVolume(event.target.value)}>
                  <option>1-10 jobs/month</option>
                  <option>11-25 jobs/month</option>
                  <option>26-50 jobs/month</option>
                  <option>50+ jobs/month</option>
                </select>
              </label>
            )}

            {step === 3 && (
              <label className="block space-y-2">
                <span className="text-sm text-slate-300">Recruiting team size</span>
                <select className="field" value={team} onChange={(event) => setTeam(event.target.value)}>
                  <option>1 recruiter</option>
                  <option>2-5 recruiters</option>
                  <option>6-15 recruiters</option>
                  <option>16+ recruiters</option>
                </select>
              </label>
            )}

            {step === 4 && (
              <div className="rounded-2xl border border-white/20 bg-white/5 p-6">
                <p className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red/20 text-red-soft">
                  <Check size={20} />
                </p>
                <h2 className="mt-4 text-xl font-semibold">Workspace ready</h2>
                <p className="mt-2 text-sm text-slate-300">
                  {company || "Your company"} is configured for {industry} with {volume} and {team}.
                </p>
                <Link href="/admin/recruiter" className="primary-btn mt-6 inline-flex">
                  Enter Recruiter Workspace
                </Link>
              </div>
            )}
          </div>

          {step < 4 && (
            <div className="mt-8 flex items-center justify-between">
              <button className="ghost-btn" type="button" onClick={prev} disabled={step === 0}>
                Back
              </button>
              <button className="primary-btn" type="button" onClick={next}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </section>
  );
}
