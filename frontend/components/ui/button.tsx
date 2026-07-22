import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-blue to-blue-soft text-white font-semibold shadow-sm hover:shadow-glow hover:brightness-110",
  secondary: "bg-gray-100 text-gray-800 border border-gray-200 hover:bg-gray-200",
  ghost: "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
  outline: "border border-blue/40 text-blue hover:bg-blue-light",
  danger: "bg-red text-white hover:bg-red-soft shadow-sm",
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
