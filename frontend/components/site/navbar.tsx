"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Brain, User, LogOut, LogIn, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/reveal";
import { useAuth } from "@/lib/auth";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/signup", label: "Sign Up" },
];

export function Navbar({ appName = "AIHire" }: { appName?: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, hasRole } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const getDashboardLink = () => {
    if (hasRole("admin")) return "/admin";
    if (hasRole("recruiter")) return "/hr";
    if (hasRole("candidate")) return "/candidate";
    return "/login";
  };

  const getDashboardLabel = () => {
    if (hasRole("admin")) return "Admin Panel";
    if (hasRole("recruiter")) return "HR Workspace";
    if (hasRole("candidate")) return "My Dashboard";
    return "";
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-500",
        scrolled ? "py-2" : "py-4",
      )}
    >
      <div className="container-px">
        <nav
          className={cn(
            "mx-auto flex max-w-7xl items-center justify-between rounded-full px-5 py-3 transition-all duration-500",
            scrolled
              ? "bg-white/95 shadow-card border border-gray-200/80 backdrop-blur-xl"
              : "bg-transparent",
          )}
        >
          <Link href="/" className="group flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue to-red text-white shadow-sm">
              <Brain className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-bold tracking-wide text-gray-900">
              {appName}
            </span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-sm transition-colors",
                    active
                      ? "text-blue font-medium"
                      : "text-gray-600 hover:text-gray-900",
                  )}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 -z-10 rounded-full bg-blue-light"
                    />
                  )}
                </Link>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2">
            {isAuthenticated() ? (
              <>
                <Magnetic>
                  <Link href={getDashboardLink()}>
                    <Button size="sm" variant="ghost">
                      <User className="h-4 w-4" /> {getDashboardLabel()}
                    </Button>
                  </Link>
                </Magnetic>
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-gray-300 transition-all"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue to-red text-white text-[10px] font-bold">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </span>
                    <span className="hidden xl:inline text-xs">{user?.name}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white shadow-card p-2 z-50"
                      >
                        <div className="px-3 py-2 border-b border-gray-100 mb-1">
                          <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                          <span className="mt-1 inline-block chip bg-blue-light text-blue text-[10px]">{user?.role}</span>
                        </div>
                        <Link href={getDashboardLink()} className="block rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                          Dashboard
                        </Link>
                        <Link href="/signup" className="block rounded-xl px-3 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                          Sign Up
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="ghost">
                    <LogIn className="h-4 w-4" /> Sign In
                  </Button>
                </Link>
                <Magnetic>
                  <Link href="/signup">
                    <Button size="sm">Get Started</Button>
                  </Link>
                </Magnetic>
              </>
            )}
          </div>

          <button
            className="lg:hidden text-gray-700 focus-ring rounded-full p-2 hover:bg-gray-100 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X /> : <Menu />}
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="container-px mt-2 lg:hidden"
          >
            <div className="mx-auto max-w-7xl rounded-3xl bg-white border border-gray-200 shadow-card p-4">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block rounded-2xl px-4 py-3 text-base transition-colors",
                    pathname === item.href
                      ? "text-blue bg-blue-light font-medium"
                      : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/signup" className="mt-2 block">
                <Button className="w-full">Get Started</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
