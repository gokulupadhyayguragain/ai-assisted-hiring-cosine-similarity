import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string | null;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <Reveal className={cn("max-w-3xl", align === "center" ? "mx-auto text-center" : "text-left", className)}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="display-title text-3xl sm:text-4xl md:text-5xl text-balance">{title}</h2>
      {subtitle && <p className="mt-4 text-zinc-400 text-base md:text-lg leading-relaxed">{subtitle}</p>}
    </Reveal>
  );
}
