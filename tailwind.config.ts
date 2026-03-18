import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B3A5C",
          light: "#2D5F8A",
          lighter: "#E8EFF6",
        },
        secondary: "#2E7D32",
        accent: "#E65100",
        surface: "#FFFFFF",
        background: "#F5F7FA",
        border: "#E5E7EB",
        "text-primary": "#1A1A2E",
        "text-secondary": "#6B7280",
        risk: {
          safe: "#22C55E",
          caution: "#EAB308",
          warning: "#F97316",
          danger: "#EF4444",
        },
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
