import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* Palette pulled straight from the Dream Comfort logo.
         * Driven by CSS variables (defined in globals.css) so a landing page can
         * re-skin the shared funnel components — order form, sticky bar, reviews —
         * just by setting a theme class. :root keeps the original logo colours, so
         * every existing page renders exactly as before. */
        cream: { DEFAULT: "rgb(var(--c-cream) / <alpha-value>)", deep: "rgb(var(--c-cream-deep) / <alpha-value>)" },
        brand: {
          DEFAULT: "rgb(var(--c-brand) / <alpha-value>)",
          dark: "rgb(var(--c-brand-dark) / <alpha-value>)",
          light: "rgb(var(--c-brand-light) / <alpha-value>)",
          soft: "rgb(var(--c-brand-soft) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--c-accent) / <alpha-value>)",
          dark: "rgb(var(--c-accent-dark) / <alpha-value>)",
          light: "rgb(var(--c-accent-light) / <alpha-value>)",
          soft: "rgb(var(--c-accent-soft) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "var(--font-bengali)", "system-ui", "sans-serif"],
        sans: ["var(--font-bengali)", "var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgb(var(--c-brand) / 0.35)",
        pink: "0 10px 40px -12px rgb(var(--c-accent) / 0.45)",
        cta: "0 14px 30px -8px rgb(var(--c-accent-dark) / 0.55)",
      },
    },
  },
  plugins: [],
};
export default config;
