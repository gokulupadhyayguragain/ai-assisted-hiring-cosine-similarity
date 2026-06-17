import Link from "next/link";
import { Github, Twitter, Linkedin, Brain } from "lucide-react";

const socials = [
  { href: "https://github.com", icon: Github, label: "GitHub" },
  { href: "https://twitter.com", icon: Twitter, label: "Twitter" },
  { href: "https://linkedin.com", icon: Linkedin, label: "LinkedIn" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/10 bg-ink-950">
      <div className="container-px mx-auto max-w-7xl py-16">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue to-red text-white">
                <Brain className="h-5 w-5" />
              </span>
              <span className="font-display text-xl font-bold text-white">AIHire</span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-400">
              Fair AI-powered hiring with anonymized screening, explainable rankings, and
              transparency reports. Rank talent by skill, not by bias.
            </p>
            <div className="mt-6 flex gap-3">
              {socials.map(({ href, icon: Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="glass flex h-10 w-10 items-center justify-center rounded-full text-zinc-300 transition-colors hover:text-blue"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white">Platform</h4>
            <ul className="mt-4 space-y-2 text-sm text-zinc-400">
              {[
                ["/onboarding", "Get Started"],
                ["/reports", "Reports"],
                ["/settings", "Settings"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="transition-colors hover:text-blue">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white">Resources</h4>
            <ul className="mt-4 space-y-2 text-sm text-zinc-400">
              <li><a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" className="transition-colors hover:text-blue">API Docs</a></li>
              <li><Link href="/privacy" className="transition-colors hover:text-blue">Privacy Policy</Link></li>
              <li><Link href="/terms" className="transition-colors hover:text-blue">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-zinc-500 sm:flex-row">
          <p>&copy; {year} AIHire. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-blue">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-blue">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
