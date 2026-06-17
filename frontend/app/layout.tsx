import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Providers } from "@/components/ui/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  title: {
    default: "AIHire | AI Assisted Hiring",
    template: "%s | AIHire",
  },
  description:
    "Containerized AI-assisted hiring with anonymized cosine similarity screening, explainable rankings, and transparency reports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} dark`} suppressHydrationWarning>
      <body className="noise-overlay antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
