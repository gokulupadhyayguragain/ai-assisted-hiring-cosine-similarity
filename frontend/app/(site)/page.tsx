import { ArrowRight, Brain, FileSearch, ShieldCheck, BarChart3, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/site/section-heading";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Screening",
    description: "Combines TF-IDF and semantic SBERT scoring for accurate, explainable candidate matching against any job description.",
  },
  {
    icon: ShieldCheck,
    title: "Bias Detection",
    description: "Built-in audit engine scans job descriptions for biased language and generates transparency reports per candidate.",
  },
  {
    icon: BarChart3,
    title: "Rank & Compare",
    description: "Rank candidates by overall score, compare matched skills, and drill into granular TF-IDF and semantic contributions.",
  },
  {
    icon: FileSearch,
    title: "Transparency Reports",
    description: "Every screening produces downloadable CSV leaderboards and per-candidate PDF reports for full auditability.",
  },
  {
    icon: Sparkles,
    title: "Anonymization",
    description: "Detect and redact PII (names, emails, phone numbers) before scoring to reduce unconscious bias in hiring.",
  },
  {
    icon: Users,
    title: "Dual Workspace",
    description: "Separate flows for recruiters and job seekers — create jobs, upload resumes, or check your own skill-gap fit.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background spotlight */}
        <div className="spotlight-radial pointer-events-none absolute inset-0" />

        <div className="container-px mx-auto max-w-7xl pt-32 pb-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="eyebrow mb-4 animate-fade-up">Fair AI-Powered Hiring</p>
            <h1 className="display-title text-4xl sm:text-5xl md:text-7xl text-balance animate-fade-up" style={{ animationDelay: "0.1s" }}>
              Rank talent by <span className="blue-text">skill</span>, not by{" "}
              <span className="red-text">bias</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg text-zinc-400 leading-relaxed animate-fade-up" style={{ animationDelay: "0.2s" }}>
              AIHire combines anonymization, dual-engine scoring (TF-IDF + semantic),
              explainable rankings, and transparency reports — all in a containerized stack.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <Link href="/onboarding">
                <Button size="lg">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
                <Button variant="outline" size="lg">API Docs</Button>
              </a>
            </div>
          </div>

          {/* Workspace selection cards */}
          <div className="mt-16 grid gap-4 md:grid-cols-2 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <Link
              href="/hr"
              className="group glass-card p-6 md:p-8 transition-all duration-300 hover:border-blue/40 hover:shadow-glow"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue/15 text-blue">
                <Users className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-xl font-semibold text-white">HR Workspace</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Create job postings, upload resumes, process rankings, run bias audits, and export transparency reports.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue group-hover:gap-2 transition-all">
                Enter Workspace <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
            <Link
              href="/candidate"
              className="group glass-card p-6 md:p-8 transition-all duration-300 hover:border-red/40 hover:shadow-glow-red"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-red/15 text-red-soft">
                <Brain className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-xl font-semibold text-white">Candidate Workspace</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Upload your resume, check personalized skill-gap fit against job descriptions, and see how you rank.
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-red-soft group-hover:gap-2 transition-all">
                Enter Workspace <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section container-px mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Capabilities"
          title="Everything you need for fair hiring"
          subtitle="From dual-engine scoring to bias audits and transparency reports — AIHire gives recruiters and candidates full visibility into every decision."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="glass-card p-6 transition-all duration-300 hover:border-white/20 hover:-translate-y-1">
              <feature.icon className="h-8 w-8 text-blue" />
              <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="section container-px mx-auto max-w-7xl">
        <div className="glass-card relative overflow-hidden p-10 md:p-16 text-center">
          <div className="spotlight-radial pointer-events-none absolute inset-0" />
          <div className="relative">
            <h2 className="display-title text-3xl md:text-5xl">Ready to transform your hiring?</h2>
            <p className="mt-4 mx-auto max-w-lg text-zinc-400">
              Deploy the full stack with Docker Compose and start screening resumes with AI-powered fairness in minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/onboarding">
                <Button size="lg">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
                <Button variant="ghost" size="lg">Read the Docs</Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
