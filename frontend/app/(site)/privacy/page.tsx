import { ShieldCheck, Mail, Database, Eye, Lock, FileText, Scale, RefreshCw, Brain } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How AIHire collects, uses, stores, and protects your personal data across our AI-assisted hiring platform, including AI decision-making transparency.",
};

const sections = [
  {
    icon: ShieldCheck,
    title: "1. Who We Are",
    content: (
      <>
        <p className="mb-4">
          AIHire (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates an AI-assisted hiring
          platform that provides anonymized resume screening, semantic matching, bias auditing,
          and transparency reporting. This Privacy Policy explains how we collect, use, store,
          and protect your personal data when you use our platform.
        </p>
        <p>
          Our registered entity is AIHire Technologies. For privacy-related inquiries, contact our
          Data Protection Officer at <strong className="text-gray-700">privacy@aihire.dev</strong> or
          via postal mail at 548 Market St, San Francisco, CA 94104, USA.
        </p>
      </>
    ),
  },
  {
    icon: Database,
    title: "2. Information We Collect",
    content: (
      <>
        <p className="mb-4">
          We collect information that you provide directly, information generated through your use
          of our services, and information we receive from third parties. The categories of data we
          collect include:
        </p>
        <div className="mb-4 space-y-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">Account Information</h4>
            <p className="mt-1 text-sm text-gray-600">
              When you register with an email and password or with Google sign-in, we collect your
              name and email address. Passwords are never stored in plain text — they are salted and
              hashed. If you use Google sign-in, authentication is handled by Google.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">Resume & Job Data</h4>
            <p className="mt-1 text-sm text-gray-600">
              Uploaded resumes, CVs, cover letters, and job descriptions. This includes any
              personal information contained within these documents such as education history,
              employment history, skills, certifications, contact details, and professional
              references.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">Usage & Analytics Data</h4>
            <p className="mt-1 text-sm text-gray-600">
              Interaction logs, feature usage, session duration, error reports, and performance
              metrics. We use this to improve our platform and detect abuse.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">Inferred & Derived Data</h4>
            <p className="mt-1 text-sm text-gray-600">
              Our AI models analyze uploaded documents to extract skills, experience levels,
              education history, and other professional attributes. This derived data is used
              exclusively for matching and scoring purposes.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    icon: Eye,
    title: "3. How We Use Your Information",
    content: (
      <>
        <p className="mb-4">
          We use the data we collect solely to provide, maintain, and improve our hiring platform.
          Specifically:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
          <li>To process and score resumes against job descriptions using our AI matching engine</li>
          <li>To generate anonymized candidate rankings, skill-gap analyses, and transparency reports</li>
          <li>To detect and reduce bias in job descriptions through our bias audit engine</li>
          <li>To enable recruiters and candidates to compare skills, experience, and fit scores</li>
          <li>To improve our AI models — only on anonymized, aggregated data that cannot identify individuals</li>
          <li>To communicate with you about service updates, security notices, and support requests</li>
          <li>To comply with legal obligations and enforce our Terms of Service</li>
        </ul>
      </>
    ),
  },
  {
    icon: Lock,
    title: "4. Data Storage & Security",
    content: (
      <>
        <p className="mb-4">
          We implement industry-standard technical and organizational measures to protect your data:
        </p>
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <div className="rounded-xl border border-gray-100 bg-green-50/50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">Encryption at Rest</h4>
            <p className="mt-1 text-xs text-gray-600">
              All stored data is encrypted using AES-256. Database backups are also encrypted.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-green-50/50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">Encryption in Transit</h4>
            <p className="mt-1 text-xs text-gray-600">
              All API traffic uses TLS 1.3. We enforce HTTPS with HSTS headers.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-green-50/50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">Anonymization</h4>
            <p className="mt-1 text-xs text-gray-600">
              PII (names, emails, phones) detected in uploaded documents is redacted before processing.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-green-50/50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">Access Control</h4>
            <p className="mt-1 text-xs text-gray-600">
              Role-based access (admin, recruiter, candidate). No cross-account data access.
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Data is stored in ISO 27001-certified data centers. We conduct regular security audits and
          penetration testing. In the event of a data breach, we will notify affected users within
          72 hours as required by applicable law.
        </p>
      </>
    ),
  },
  {
    icon: RefreshCw,
    title: "5. Data Retention & Deletion",
    content: (
      <>
        <p className="mb-4">
          We retain your data only as long as necessary to provide our services:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
          <li>
            <strong>Account data:</strong> Retained until you delete your account. You can request
            account deletion at any time via your profile settings or by emailing us.
          </li>
          <li>
            <strong>Resumes and job descriptions:</strong> Retained for the duration of active
            screening sessions plus 90 days. You may delete individual uploads at any time.
          </li>
          <li>
            <strong>Analytics logs:</strong> Aggregated data retained for 24 months. Raw logs
            are deleted after 90 days.
          </li>
          <li>
            <strong>Backups:</strong> Encrypted backups are retained for 30 days, then permanently
            deleted.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: Scale,
    title: "6. Data Sharing & Disclosure",
    content: (
      <>
        <p className="mb-4">
          We do not sell your personal data. We share data only in the following circumstances:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
          <li>
            <strong>With your consent:</strong> When you explicitly authorize sharing (e.g.,
            sharing a screening report with a colleague).
          </li>
          <li>
            <strong>Service providers:</strong> We use subprocessors for cloud infrastructure
            (AWS, GCP), email delivery (Resend), and error monitoring. Each subprocessor is
            contractually bound to protect your data.
          </li>
          <li>
            <strong>Legal compliance:</strong> When required by law, court order, or governmental
            regulation, we will disclose data to the extent required.
          </li>
          <li>
            <strong>Business transfers:</strong> In the event of a merger, acquisition, or sale
            of assets, your data may be transferred with notice to you.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: FileText,
    title: "7. Your Rights (GDPR, CCPA & Others)",
    content: (
      <>
        <p className="mb-4">
          Depending on your jurisdiction, you have the following rights regarding your personal
          data. We will respond to all legitimate requests within 30 days.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          {[
            { right: "Right to Access", desc: "Request a copy of the personal data we hold about you" },
            { right: "Right to Rectification", desc: "Correct inaccurate or incomplete data" },
            { right: "Right to Deletion", desc: "Request deletion of your personal data (erasure)" },
            { right: "Right to Portability", desc: "Receive your data in a machine-readable format" },
            { right: "Right to Restrict Processing", desc: "Limit how we use your data" },
            { right: "Right to Object", desc: "Object to processing based on legitimate interests" },
            { right: "Right to Withdraw Consent", desc: "Withdraw consent at any time, without affecting lawful processing before withdrawal" },
            { right: "Right to Non-Discrimination", desc: "We will not discriminate against you for exercising your CCPA rights" },
          ].map(({ right, desc }) => (
            <div key={right} className="rounded-xl border border-gray-100 p-3">
              <h4 className="text-sm font-semibold text-gray-900">{right}</h4>
              <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          To exercise any of these rights, contact us at{" "}
          <strong className="text-gray-700">privacy@aihire.dev</strong>. We may need to verify your
          identity before processing your request. California residents may also designate an
          authorized agent to make requests on their behalf.
        </p>
      </>
    ),
  },
  {
    icon: Brain,
    title: "8. AI & Automated Decision-Making",
    content: (
      <>
        <p className="mb-4">
          AIHire uses machine learning models to assist with resume screening and candidate
          matching. This section explains how our AI works and your rights regarding automated
          decisions.
        </p>
        <div className="space-y-4">
          <div className="rounded-xl border border-blue/10 bg-blue-light/20 p-4">
            <h4 className="text-sm font-semibold text-gray-900">How Our AI Works</h4>
            <p className="mt-1 text-sm text-gray-600">
              Our matching engine uses a hybrid approach: TF-IDF keyword scoring combined with
              semantic embeddings (BGE Small EN) to evaluate resume-job fit. It does <em>not</em>{' '}
              use facial recognition, personality profiling, or any biometric data. The system is
              designed to augment — not replace — human hiring decisions.
            </p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">Transparency & Explainability</h4>
            <p className="mt-1 text-sm text-gray-600">
              Every scoring decision is explainable. Our transparency reports break down how each
              candidate&apos;s score was calculated, showing TF-IDF contributions, semantic similarity,
              matched skills, and keyword density. You can always see <em>why</em> a candidate
              received a particular score.
            </p>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">Bias Detection</h4>
            <p className="mt-1 text-sm text-gray-600">
              Our bias audit engine scans job descriptions for biased language (gender-coded words,
              age-discriminatory terms, etc.). We also anonymize PII before scoring to reduce
              unconscious bias. However, no AI system is perfect — we encourage human review of
              all AI-generated rankings.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-600">
          If you believe an automated decision has been made in error or wish to appeal, please
          contact us at <strong className="text-gray-700">appeals@aihire.dev</strong>. You have
          the right to request human intervention in any automated decision.
        </p>
      </>
    ),
  },
  {
    icon: Mail,
    title: "9. Contact Us",
    content: (
      <>
        <p className="mb-4">
          If you have questions, concerns, or requests regarding this Privacy Policy or our data
          practices, please contact us:
        </p>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2 text-sm">
          <p><strong className="text-gray-700">Email:</strong> privacy@aihire.dev</p>
          <p><strong className="text-gray-700">DPO:</strong> dpo@aihire.dev</p>
          <p><strong className="text-gray-700">Address:</strong> 548 Market St, San Francisco, CA 94104, USA</p>
          <p><strong className="text-gray-700">Response time:</strong> Within 48 hours for initial inquiries</p>
        </div>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-light/40 via-white to-white pt-28 sm:pt-32 pb-12 sm:pb-16">
        <div className="spotlight-radial pointer-events-none absolute inset-0" />
        <div className="container-px mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue/20 bg-blue-light/50 px-4 py-1.5 text-xs font-medium text-blue">
            Last updated: June 17, 2026
          </div>
          <h1 className="display-title mt-6 text-4xl sm:text-5xl md:text-6xl text-balance">
            Privacy Policy
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            How AIHire collects, uses, stores, and protects your personal data across our
            AI-assisted hiring platform.
          </p>
        </div>
      </section>

      {/* Table of Contents */}
      <section className="container-px mx-auto max-w-4xl -mt-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card mb-12">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Contents</h2>
          <nav className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((s) => (
              <a
                key={s.title}
                href={`#section-${s.title.split(". ")[0]}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <s.icon className="h-4 w-4 shrink-0 text-blue" />
                <span className="truncate">{s.title}</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* Sections */}
      <section className="container-px mx-auto max-w-4xl pb-20 space-y-8">
        {sections.map((section, i) => (
          <article
            key={section.title}
            id={`section-${i + 1}`}
            className="rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-card scroll-mt-24"
          >
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-light text-blue">
                <section.icon className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{section.title}</h2>
                <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-600">
                  {section.content}
                </div>
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* Footer CTA */}
      <section className="border-t border-gray-200 bg-gray-50">
        <div className="container-px mx-auto max-w-4xl py-12 text-center">
          <p className="text-sm text-gray-500">
            Questions about our privacy practices? Contact us at{" "}
            <Link href="mailto:privacy@aihire.dev" className="font-medium text-blue hover:underline">
              privacy@aihire.dev
            </Link>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Or read our{" "}
            <Link href="/terms" className="underline hover:text-gray-600">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
