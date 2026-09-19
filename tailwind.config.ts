import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette pulled straight from the Dream Comfort logo.
        cream: { DEFAULT: "#FBF3EA", deep: "#F6E9DA" },
        brand: {
          DEFAULT: "#2F90CC", // deeper, more confident blue (better contrast on off-white)
          dark: "#1E7AAF",
          light: "#BFE3F5",
          soft: "#EAF5FD",
        },
        accent: {
          DEFAULT: "#F0A0C0", // soft logo pink ("COMFORT") — identity kept
          dark: "#DE6699",    // deeper pink for legible price / emphasis text
          light: "#FBD9E7",
          soft: "#FDEDF3",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "var(--font-bengali)", "system-ui", "sans-serif"],
        sans: ["var(--font-bengali)", "var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(47,144,204,0.35)",
        pink: "0 10px 40px -12px rgba(240,160,192,0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
