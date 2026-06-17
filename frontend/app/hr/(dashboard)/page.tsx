import { Briefcase, Users, BarChart3, ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HrDashboard() {
  const stats = [
    { label: "Active Jobs", value: "—", icon: Briefcase, href: "/hr/jobs", color: "text-blue" },
    { label: "Candidates", value: "—", icon: Users, href: "/hr/rankings", color: "text-blue" },
    { label: "Sessions Run", value: "—", icon: BarChart3, href: "/hr/screening", color: "text-blue" },
    { label: "Bias Audits", value: "—", icon: ShieldCheck, href: "/hr/bias", color: "text-blue" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-title text-2xl md:text-3xl text-white">HR Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">Hiring workspace — manage jobs, screen candidates, and compare resumes.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="glass-card p-5 transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5">
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
            <p className="mt-4 text-2xl font-bold text-white">{stat.value}</p>
            <p className="mt-1 text-sm text-zinc-400">{stat.label}</p>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/hr/screening" className="glass-card group p-6 flex items-start gap-4 transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5">
          <div className="flex-1">
            <p className="font-semibold text-white group-hover:text-blue transition-colors">Run AI Screening</p>
            <p className="mt-1 text-sm text-zinc-400">Upload resumes and run the anonymize-vectorize-rank pipeline.</p>
          </div>
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-500 group-hover:text-blue transition-colors" />
        </Link>
        <Link href="/hr/compare" className="glass-card group p-6 flex items-start gap-4 transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5">
          <div className="flex-1">
            <p className="font-semibold text-white group-hover:text-blue transition-colors">Compare Resumes</p>
            <p className="mt-1 text-sm text-zinc-400">Side-by-side visual comparison with tie-breaking.</p>
          </div>
          <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-500 group-hover:text-blue transition-colors" />
        </Link>
      </div>
    </div>
  );
}
