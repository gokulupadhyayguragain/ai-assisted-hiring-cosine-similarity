import { HrShell } from "@/components/hr/hr-shell";

export default function HrRootLayout({ children }: { children: React.ReactNode }) {
  return <HrShell>{children}</HrShell>;
}
