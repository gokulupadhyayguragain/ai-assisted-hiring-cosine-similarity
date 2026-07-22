import {
  FileText,
  UserCheck,
  ShieldCheck,
  Scale,
  AlertTriangle,
  Brain,
  Ban,
  Mail,
  Globe,
  RefreshCw,
} from "lucide-react";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of the AIHire AI-assisted hiring platform, including AI disclaimers, acceptable use, and liability limitations.",
};
import Link from "next/link";

const sections = [
  {
    icon: FileText,
    title: "1. Acceptance of Terms",
    content: (
      <>
        <p className="mb-4">
          By accessing or using AIHire (&ldquo;the Platform&rdquo;), you agree to be bound by these
          Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to all terms, you must not
          access or use the Platform.
        </p>
        <p className="mb-4">
          These Terms apply to all users of the Platform, including recruiters, HR professionals,
          hiring managers, candidates, job seekers, students, and any other visitors
          (&ldquo;Users&rdquo;). By creating an account or using any feature of the Platform, you
          acknowledge that you have read, understood, and agree to be bound by these Terms.
        </p>
        <p className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>Note:</strong> These Terms include our{" "}
          <Link href="/privacy" className="font-medium underline hover:text-amber-900">
            Privacy Policy
          </Link>
          , which is incorporated by reference. If you are using the Platform on behalf of an
          organization, you represent that you have the authority to bind that organization to
          these Terms.
        </p>
      </>
    ),
  },
  {
    icon: Globe,
    title: "2. Description of Service",
    content: (
      <>
        <p className="mb-4">
          AIHire provides an AI-assisted hiring platform that includes the following core
          capabilities:
        </p>
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          {[
            {
              title: "Resume Screening",
              desc: "Upload and score resumes against job descriptions using hybrid AI matching (TF-IDF + semantic embeddings)",
            },
            {
              title: "Anonymization",
              desc: "Automatic detection and redaction of personally identifiable information (PII) before scoring",
            },
            {
              title: "Bias Auditing",
              desc: "Scan job descriptions for biased or exclusionary language before publishing",
            },
            {
              title: "Transparency Reports",
              desc: "Downloadable per-candidate PDF reports and CSV leaderboards showing how every score was calculated",
            },
            {
              title: "Skill Gap Analysis",
              desc: "Compare candidate skills against job requirements with actionable suggestions",
            },
            {
              title: "CV Optimization",
              desc: "AI-powered ATS scoring, keyword analysis, and template-based CV reformatting for candidates",
            },
          ].map(({ title, desc }) => (
            <div key={title} className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
              <p className="mt-1 text-xs text-gray-600">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600">
          The Platform is provided as a web application accessed through a modern browser. We
          reserve the right to modify, suspend, or discontinue any feature with reasonable notice.
        </p>
      </>
    ),
  },
  {
    icon: UserCheck,
    title: "3. User Accounts & Responsibilities",
    content: (
      <>
        <p className="mb-4">
          You are responsible for maintaining the confidentiality of your account and for all
          activities that occur under your account.
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600 mb-4">
          <li>You must provide accurate, current, and complete account information</li>
          <li>
            Authentication is handled via email &amp; password (salted + hashed) or Google sign-in
          </li>
          <li>You choose your role (candidate, recruiter, or student) when you sign up</li>
          <li>You must not share your account credentials with any third party</li>
          <li>You must notify us immediately of any unauthorized use of your account</li>
          <li>You are responsible for all content uploaded under your account</li>
          <li>You must be at least 18 years of age to create an account</li>
        </ul>
        <p className="text-sm text-gray-600">
          We reserve the right to suspend or terminate accounts that violate these Terms or
          applicable law.
        </p>
      </>
    ),
  },
  {
    icon: Ban,
    title: "4. Acceptable Use",
    content: (
      <>
        <p className="mb-4">
          You agree to use the Platform only for lawful purposes and in accordance with these Terms.
          Prohibited activities include:
        </p>
        <div className="space-y-2 mb-4">
          {[
            "Uploading resumes or job descriptions containing malware, viruses, or malicious code",
            "Attempting to reverse engineer, decompile, or extract the source code of our AI models",
            "Using the Platform to discriminate against candidates based on protected characteristics",
            "Scraping, crawling, or harvesting data from the Platform without written permission",
            "Impersonating any person or entity or misrepresenting your affiliation",
            "Interfering with or disrupting the Platform&apos;s servers or networks",
            "Using the Platform to violate any applicable local, state, national, or international law",
            "Uploading content that is defamatory, obscene, or otherwise objectionable",
          ].map((prohibition) => (
            <div key={prohibition} className="flex items-start gap-2 text-sm text-gray-600">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red" />
              <span>{prohibition}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    icon: Brain,
    title: "5. AI Features & Disclaimers",
    content: (
      <>
        <p className="mb-4">
          AIHire uses machine learning models to assist with hiring decisions. This section
          explains the limitations and disclaimers that apply to our AI features.
        </p>
        <div className="space-y-4 mb-4">
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">AI Is Assistive, Not Decisive</h4>
            <p className="mt-1 text-sm text-gray-600">
              Our AI matching engine is designed to <em>assist</em> human decision-making, not
              replace it. All scores, rankings, and suggestions should be reviewed by qualified
              human professionals before any hiring decision is made. We expressly disclaim any
              liability for hiring decisions made based solely on AI-generated outputs.
            </p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">No Guarantee of Accuracy</h4>
            <p className="mt-1 text-sm text-gray-600">
              While we continuously work to improve our models, AI systems can produce incorrect,
              incomplete, or biased results. We do not guarantee that scores, skill extractions,
              or bias audits are error-free. Users should independently verify critical findings.
            </p>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">Model Limitations</h4>
            <p className="mt-1 text-sm text-gray-600">
              Our semantic matching model (BGE Small EN) is trained on general English text and
              may not perform optimally on highly specialized domains, non-English resumes, or
              unconventional formats. Performance on these inputs is not guaranteed.
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <h4 className="text-sm font-semibold text-gray-900">Fairness & Bias</h4>
            <p className="mt-1 text-sm text-gray-600">
              Our bias audit engine can detect certain types of biased language but cannot detect
              all forms of bias. We encourage users to conduct independent fairness reviews of
              their hiring processes. Automated anonymization reduces but does not eliminate the
              risk of bias.
            </p>
          </div>
        </div>
      </>
    ),
  },
  {
    icon: Scale,
    title: "6. Intellectual Property",
    content: (
      <>
        <p className="mb-4">
          <strong className="text-gray-900">Our IP:</strong> The Platform, including its source
          code, AI models, algorithms, design, logos, and documentation, is owned by AIHire
          Technologies and protected by copyright, trademark, and trade secret laws. You may not
          copy, modify, distribute, sell, or create derivative works without our written consent.
        </p>
        <p className="mb-4">
          <strong className="text-gray-900">Your IP:</strong> You retain full ownership of all
          content you upload to the Platform (resumes, job descriptions, etc.). By uploading
          content, you grant us a limited license to process, store, and analyze that content
          solely for the purpose of providing our services to you.
        </p>
        <p>
          <strong className="text-gray-900">Feedback:</strong> If you provide feedback or
          suggestions about our Platform, we may use them without compensation or obligation to you.
        </p>
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "7. Privacy & Data Handling",
    content: (
      <>
        <p className="mb-4">
          Your privacy is important to us. Our data handling practices are described in detail
          in our{" "}
          <Link href="/privacy" className="font-medium text-blue hover:underline">
            Privacy Policy
          </Link>
          . Key commitments include:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-sm text-gray-600">
          <li>We do not sell your personal data</li>
          <li>All uploaded content is encrypted at rest (AES-256) and in transit (TLS 1.3)</li>
          <li>PII detected in resumes is anonymized before processing</li>
          <li>You can request data deletion at any time</li>
          <li>We comply with GDPR, CCPA, and other applicable privacy regulations</li>
          <li>Aggregated data used for model training is de-identified and cannot be traced to individuals</li>
        </ul>
      </>
    ),
  },
  {
    icon: AlertTriangle,
    title: "8. Limitation of Liability",
    content: (
      <>
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 mb-4">
          <p className="text-sm text-red-800 leading-relaxed">
            To the maximum extent permitted by applicable law, AIHire Technologies and its
            affiliates, officers, employees, and licensors shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages, including but not limited to:
            loss of profits, data, use, goodwill, or other intangible losses, resulting from (i)
            your use or inability to use the Platform; (ii) any hiring decisions made based on
            Platform outputs; (iii) unauthorized access to or alteration of your transmissions or
            data; (iv) statements or conduct of any third party on the Platform; or (v) any other
            matter relating to the Platform.
          </p>
        </div>
        <p className="text-sm text-gray-600">
          Our total liability to you for any claim arising from or relating to these Terms or the
          Platform shall not exceed the amount paid by you, if any, for accessing the Platform
          during the twelve (12) months preceding the claim. Some jurisdictions do not allow the
          exclusion of certain warranties or limitations of liability, so the above limitations may
          not apply to you.
        </p>
      </>
    ),
  },
  {
    icon: RefreshCw,
    title: "9. Modifications & Termination",
    content: (
      <>
        <p className="mb-4">
          <strong className="text-gray-900">Modifications:</strong> We may revise these Terms at
          any time by posting the revised version on the Platform. Changes take effect 30 days
          after posting. Your continued use of the Platform after the effective date constitutes
          acceptance of the revised Terms. We will notify you of material changes via email or
          an in-app notification.
        </p>
        <p className="mb-4">
          <strong className="text-gray-900">Termination by You:</strong> You may terminate your
          account at any time through your profile settings or by emailing us. Upon termination,
          we will delete your personal data in accordance with our Privacy Policy.
        </p>
        <p>
          <strong className="text-gray-900">Termination by Us:</strong> We may suspend or terminate
          your access to the Platform for violation of these Terms, illegal activity, or extended
          inactivity. We will provide notice and an opportunity to cure where reasonably possible.
          Sections 5 (AI Disclaimers), 6 (IP), 8 (Liability), and 10 (Governing Law) survive
          termination.
        </p>
      </>
    ),
  },
  {
    icon: Scale,
    title: "10. Governing Law",
    content: (
      <>
        <p className="mb-4">
          These Terms shall be governed by and construed in accordance with the laws of the State
          of California, United States, without regard to its conflict of law provisions.
        </p>
        <p className="mb-4">
          Any disputes arising from these Terms or the Platform shall be resolved exclusively in
          the state or federal courts located in San Francisco County, California. You consent to
          the personal jurisdiction of these courts.
        </p>
        <p className="text-sm text-gray-600">
          The United Nations Convention on Contracts for the International Sale of Goods and the
          Uniform Computer Information Transactions Act do not apply to these Terms. If any
          provision of these Terms is held to be unenforceable, the remaining provisions will
          remain in full force and effect.
        </p>
      </>
    ),
  },
  {
    icon: Mail,
    title: "11. Contact & Legal Notices",
    content: (
      <>
        <p className="mb-4">
          For legal notices, DMCA takedown requests, or questions about these Terms:
        </p>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2 text-sm">
          <p><strong className="text-gray-700">Email:</strong> legal@aihire.dev</p>
          <p><strong className="text-gray-700">DMCA:</strong> dmca@aihire.dev</p>
          <p><strong className="text-gray-700">Address:</strong> 548 Market St, San Francisco, CA 94104, USA</p>
          <p><strong className="text-gray-700">Response time:</strong> Within 5 business days for legal inquiries</p>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          This document was last updated on <strong className="text-gray-700">June 17, 2026</strong>.
          Previous versions are available upon request.
        </p>
      </>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-red-light/30 via-white to-white pt-28 sm:pt-32 pb-12 sm:pb-16">
        <div className="spotlight-radial pointer-events-none absolute inset-0" />
        <div className="container-px mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-red/20 bg-red-light/50 px-4 py-1.5 text-xs font-medium text-red">
            Last updated: June 17, 2026
          </div>
          <h1 className="display-title mt-6 text-4xl sm:text-5xl md:text-6xl text-balance">
            Terms of Service
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            The terms governing your use of the AIHire AI-assisted hiring platform.
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
                <s.icon className="h-4 w-4 shrink-0 text-red" />
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
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-light text-red">
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
            Have legal questions? Contact us at{" "}
            <Link href="mailto:legal@aihire.dev" className="font-medium text-red hover:underline">
              legal@aihire.dev
            </Link>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            Read our{" "}
            <Link href="/privacy" className="underline hover:text-gray-600">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
