import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette — white theme
        blue: {
          DEFAULT: "#003893",
          soft: "#1a5bbf",
          deep: "#002766",
          light: "#e8eff9",
        },
        red: {
          DEFAULT: "#CE1126",
          soft: "#e83a4e",
          light: "#fde8ea",
        },
        nepal: {
          blue: "#003893",
          red: "#CE1126",
          black: "#111111",
          white: "#ffffff",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "spotlight-radial":
          "radial-gradient(circle at 50% 0%, rgba(0,56,147,0.08), transparent 60%)",
        "nepal-sheen":
          "linear-gradient(120deg, #003893 0%, #1a5bbf 40%, #002766 100%)",
        "flag-gradient":
          "linear-gradient(120deg, #CE1126 0%, #e83a4e 40%, #CE1126 100%)",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover":
          "0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)",
        glow: "0 0 30px rgba(0,56,147,0.15)",
        "glow-red": "0 0 30px rgba(206,17,38,0.15)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 6s ease-in-out infinite",
        marquee: "marquee 30s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
