import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ats: {
          black: "var(--color-ats-black)",
          surface: "var(--color-ats-surface)",
          raised: "var(--color-ats-surface-raised)",
          text: "var(--color-ats-text)",
          muted: "var(--color-ats-muted)",
          border: "var(--color-ats-border)",
          blue: "var(--color-ats-blue)",
          "blue-hover": "var(--color-ats-blue-hover)",
          "blue-active": "var(--color-ats-blue-active)",
          amber: "var(--color-ats-amber)",
        },
        asphalt: "var(--color-ats-black)",
        kerb: "var(--color-ats-blue)",
        signal: "var(--color-ats-amber)",
        paddock: "var(--color-ats-black)",
        steel: "var(--color-ats-muted)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Arial", "Helvetica", "sans-serif"],
      },
      boxShadow: {
        soft: "0 24px 80px rgba(0, 0, 0, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
