"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Upload, BarChart3, FileText, Menu, X, Brain, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/candidate", label: "Dashboard", icon: LayoutDashboard },
  { href: "/candidate/upload", label: "My Resume", icon: Upload },
  { href: "/candidate/skill-gap", label: "Skill Gap", icon: BarChart3 },
  { href: "/candidate/reports", label: "My Reports", icon: FileText },
];

export function CandidateShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink-950">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/10 bg-ink-900 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-white/10 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue to-red text-white">
            <Brain className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold text-white">AIHire</span>
        </div>
        <nav className="flex h-[calc(100vh-4rem)] flex-col overflow-y-auto p-3">
          <div className="flex-1 space-y-1">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
              Candidate
            </p>
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active ? "bg-blue/15 text-blue" : "text-zinc-400 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-white/10 pt-3 mt-3 space-y-1">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-red/15 hover:text-red-soft"
            >
              <LogOut className="h-4 w-4" /> Back to Site
            </Link>
          </div>
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-ink-950/80 px-5 backdrop-blur-xl">
          <button className="lg:hidden text-white" onClick={() => setOpen((v) => !v)} aria-label="Toggle sidebar">
            {open ? <X /> : <Menu />}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-zinc-400">Candidate Portal</span>
            <span className="h-2 w-2 rounded-full bg-blue" title="Online" />
          </div>
        </header>
        <main className="screen-bg p-5 lg:p-8">{children}</main>
      </div>

      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
    </div>
  );
}
