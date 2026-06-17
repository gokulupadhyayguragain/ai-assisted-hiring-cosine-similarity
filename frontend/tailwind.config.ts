import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Nepal flag-inspired dark palette
        ink: {
          950: "#080808",
          900: "#0d0d0d",
          800: "#161616",
          700: "#1e1e1e",
          600: "#2a2a2a",
        },
        // Nepal Blue
        blue: {
          DEFAULT: "#003893",
          soft: "#1a5bbf",
          deep: "#002766",
        },
        // Nepal Red
        red: {
          DEFAULT: "#CE1126",
          soft: "#e83a4e",
        },
        nepal: {
          blue: "#003893",
          red: "#CE1126",
          black: "#080808",
          white: "#f5f5f0",
          cream: "#f5f5f0",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "spotlight-radial":
          "radial-gradient(circle at 50% 0%, rgba(0,56,147,0.25), transparent 60%)",
        "stage-gradient":
          "linear-gradient(180deg, #080808 0%, #0d0d0d 50%, #080808 100%)",
        "nepal-sheen":
          "linear-gradient(120deg, #003893 0%, #1a5bbf 40%, #002766 100%)",
        "flag-gradient":
          "linear-gradient(120deg, #CE1126 0%, #e83a4e 40%, #CE1126 100%)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.45)",
        glow: "0 0 40px rgba(0,56,147,0.3)",
        "glow-red": "0 0 40px rgba(206,17,38,0.35)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "spotlight-sweep": {
          "0%,100%": { opacity: "0.4", transform: "translateX(-20%)" },
          "50%": { opacity: "0.8", transform: "translateX(20%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out forwards",
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 6s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
        "spotlight-sweep": "spotlight-sweep 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
