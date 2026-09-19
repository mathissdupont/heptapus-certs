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
        canvas: "rgb(var(--bg-canvas) / <alpha-value>)",
        raised: "rgb(var(--bg-raised) / <alpha-value>)",
        sunken: "rgb(var(--bg-sunken) / <alpha-value>)",
        content: {
          primary: "rgb(var(--content-primary) / <alpha-value>)",
          secondary: "rgb(var(--content-secondary) / <alpha-value>)",
          muted: "rgb(var(--content-muted) / <alpha-value>)",
          faint: "rgb(var(--content-faint) / <alpha-value>)",
          inverted: "rgb(var(--content-inverted) / <alpha-value>)",
        },
        outline: {
          subtle: "rgb(var(--border-subtle) / <alpha-value>)",
          strong: "rgb(var(--border-strong) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "var(--site-brand-color)",
          soft: "var(--site-brand-accent)",
          border: "var(--site-brand-border)",
          contrast: "var(--site-brand-contrast)",
        },
        status: {
          success: {
            bg: "rgb(var(--status-success-bg) / <alpha-value>)",
            border: "rgb(var(--status-success-border) / <alpha-value>)",
            content: "rgb(var(--status-success-content) / <alpha-value>)",
          },
          warning: {
            bg: "rgb(var(--status-warning-bg) / <alpha-value>)",
            border: "rgb(var(--status-warning-border) / <alpha-value>)",
            content: "rgb(var(--status-warning-content) / <alpha-value>)",
          },
          danger: {
            bg: "rgb(var(--status-danger-bg) / <alpha-value>)",
            border: "rgb(var(--status-danger-border) / <alpha-value>)",
            content: "rgb(var(--status-danger-content) / <alpha-value>)",
          },
          info: {
            bg: "rgb(var(--status-info-bg) / <alpha-value>)",
            border: "rgb(var(--status-info-border) / <alpha-value>)",
            content: "rgb(var(--status-info-content) / <alpha-value>)",
          },
        },
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
          50: "rgb(var(--bg-canvas) / <alpha-value>)",
          100: "rgb(var(--bg-sunken) / <alpha-value>)",
          150: "rgb(var(--border-subtle) / <alpha-value>)",
          200: "rgb(var(--border-subtle) / <alpha-value>)",
          300: "rgb(var(--border-strong) / <alpha-value>)",
          400: "rgb(var(--content-faint) / <alpha-value>)",
          500: "rgb(var(--content-muted) / <alpha-value>)",
          600: "rgb(var(--content-secondary) / <alpha-value>)",
          700: "rgb(var(--content-secondary-strong) / <alpha-value>)",
          800: "rgb(var(--content-primary-soft) / <alpha-value>)",
          900: "rgb(var(--content-primary) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "rgb(var(--bg-raised) / <alpha-value>)",
          hover: "rgb(var(--bg-sunken) / <alpha-value>)",
          active: "rgb(var(--bg-active) / <alpha-value>)",
          border: "rgb(var(--border-subtle) / <alpha-value>)",
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
