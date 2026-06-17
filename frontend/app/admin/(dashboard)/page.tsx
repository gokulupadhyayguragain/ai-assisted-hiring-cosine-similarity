import { Briefcase, Users, BarChart3, FileSearch, ArrowRight } from "lucide-react";
import Link from "next/link";

const stats = [
  { label: "Active Jobs", value: "—", icon: Briefcase, href: "/admin/recruiter" },
  { label: "Candidates", value: "—", icon: Users, href: "/admin/candidate" },
  { label: "Sessions Run", value: "—", icon: BarChart3, href: "/admin/analytics" },
  { label: "Bias Audits", value: "—", icon: FileSearch, href: "/admin/audits" },
];

const actions = [
  { label: "Create Job Posting", description: "Define skills, experience, and job requirements.", href: "/admin/recruiter/create", icon: Briefcase },
  { label: "Upload Resumes", description: "Upload candidate resumes for screening.", href: "/admin/uploads", icon: Users },
  { label: "Run Screening", description: "Process resumes against a job description.", href: "/admin/recruiter/process", icon: BarChart3 },
  { label: "Bias Audit", description: "Check a job description for biased language.", href: "/admin/audits", icon: FileSearch },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="display-title text-2xl md:text-3xl text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">Overview of your hiring pipeline.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="glass-card p-5 transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5"
          >
            <stat.icon className="h-5 w-5 text-blue" />
            <p className="mt-4 text-2xl font-bold text-white">{stat.value}</p>
            <p className="mt-1 text-sm text-zinc-400">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="glass-card group flex items-start gap-4 p-5 transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue/15 text-blue">
                <action.icon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-white group-hover:text-blue transition-colors">{action.label}</p>
                <p className="mt-0.5 text-sm text-zinc-400">{action.description}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-zinc-500 group-hover:text-blue transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
