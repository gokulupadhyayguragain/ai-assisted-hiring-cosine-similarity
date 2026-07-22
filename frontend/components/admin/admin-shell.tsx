"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  UserRound,
  BarChart3,
  Settings,
  FileSearch,
  ShieldCheck,
  Server,
  Database,
  Menu,
  X,
  LogOut,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: UserRound },
  { href: "/admin/models", label: "Models", icon: Server },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/audits", label: "Audit Logs", icon: ShieldCheck },
  { href: "/admin/reports", label: "Reports", icon: FileSearch },
  { href: "/admin/database", label: "Database", icon: Database },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r border-gray-200 bg-white shadow-sm transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue to-red text-white shadow-sm">
            <Brain className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold text-gray-900">
            AIHire Admin
          </span>
        </div>
        <nav className="flex h-[calc(100vh-4rem)] flex-col overflow-y-auto p-3">
          <div className="flex-1 space-y-1">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-blue-light text-blue font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="border-t border-gray-200 pt-3 mt-3 space-y-1">
            <Link
              href="/hr"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              <Brain className="h-4 w-4" /> HR Workspace
            </Link>
            <button
              onClick={async () => { await logout(); router.push("/"); }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-gray-600 transition-colors hover:bg-red-light hover:text-red"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </nav>
      </aside>

      {/* Content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-5 backdrop-blur-xl">
          <button
            className="lg:hidden text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle sidebar"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-gray-500">Admin Panel</span>
            <span className="h-2 w-2 rounded-full bg-blue" title="Online" />
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
