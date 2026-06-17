import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-nepal-sheen text-white font-semibold shadow-glow hover:shadow-[0_0_50px_rgba(0,56,147,0.4)] hover:brightness-110",
  secondary: "bg-white/10 text-white border border-white/15 hover:bg-white/15 backdrop-blur-md",
  ghost: "text-zinc-300 hover:text-white hover:bg-white/5",
  outline: "border border-blue/40 text-blue hover:bg-blue/10",
  danger: "bg-red text-white hover:bg-red-soft shadow-glow-red",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full transition-all duration-300 focus-ring disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
