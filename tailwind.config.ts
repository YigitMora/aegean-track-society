import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        asphalt: "#161A1D",
        kerb: "#D72638",
        signal: "#F6AE2D",
        paddock: "#F8F7F4",
        steel: "#56636F",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Arial", "Helvetica", "sans-serif"],
      },
      boxShadow: {
        soft: "0 24px 80px rgba(22, 26, 29, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
