import { CandidateShell } from "@/components/candidate/candidate-shell";

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return <CandidateShell>{children}</CandidateShell>;
}
