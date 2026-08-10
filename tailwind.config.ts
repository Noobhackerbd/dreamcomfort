import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette pulled straight from the Dream Comfort logo.
        cream: { DEFAULT: "#FBF3EA", deep: "#F6E9DA" },
        brand: {
          DEFAULT: "#5FB4E4", // logo blue ("DREAM")
          dark: "#3E9BD1",
          light: "#BFE3F5",
          soft: "#E7F4FC",
        },
        accent: {
          DEFAULT: "#F0A0C0", // logo pink ("COMFORT")
          dark: "#E77BA6",
          light: "#FBD9E7",
          soft: "#FDEDF3",
        },
      },
      fontFamily: {
        display: ['"Fredoka"', '"Baloo 2"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(95,180,228,0.35)",
        pink: "0 10px 40px -12px rgba(240,160,192,0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
