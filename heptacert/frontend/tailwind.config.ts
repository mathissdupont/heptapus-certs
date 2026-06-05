import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "11": ["0.6875rem", { lineHeight: "1rem" }],    /* 11px */
        "13": ["0.8125rem", { lineHeight: "1.25rem" }], /* 13px — between xs(12) and sm(14) */
      },
      colors: {
        // Primary brand palette: neutral charcoal/ink (replaces indigo)
        brand: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        },
        surface: {
          50: "#fafaf9",
          100: "#f5f5f4",
          150: "#efede9",
          200: "#e7e5e0",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
        },
        sidebar: {
          DEFAULT: "#fbfaf8",
          hover: "#f0ede8",
          active: "#E8E6E3",
          border: "#e8e4de",
        },
      },
      animation: {
        "fade-up":    "fadeUp 0.4s ease both",
        "fade-in":    "fadeIn 0.3s ease both",
        "scale-in":   "scaleIn 0.25s ease both",
        "slide-right":"slideRight 0.3s ease both",
        shimmer:      "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        slideRight: {
          "0%":   { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        soft: "0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px 0 rgba(0,0,0,0.03)",
        card: "0 1px 4px 0 rgba(0,0,0,0.06), 0 2px 8px 0 rgba(0,0,0,0.04)",
        lifted: "0 4px 16px 0 rgba(0,0,0,0.10), 0 2px 6px 0 rgba(0,0,0,0.06)",
        raised: "0 4px 8px 0 rgba(0,0,0,0.06), 0 2px 4px 0 rgba(0,0,0,0.04)",
        float: "0 8px 24px 0 rgba(0,0,0,0.08), 0 2px 8px 0 rgba(0,0,0,0.04)",
        brand: "0 2px 8px 0 rgba(0,0,0,0.08), 0 1px 3px 0 rgba(0,0,0,0.06)",
        modal: "0 20px 60px 0 rgba(0,0,0,0.15), 0 8px 20px 0 rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
