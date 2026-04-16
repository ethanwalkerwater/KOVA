import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#2563EB",
        "accent-light": "#EFF6FF",
        "accent-green": "#16A34A",
        "accent-green-light": "#F0FDF4",
        "accent-orange": "#EA580C",
        "accent-orange-light": "#FFF7ED",
        border: "#E5E5E5",
        "border-light": "#F0F0F0",
        "fg-primary": "#1A1A1A",
        "fg-secondary": "#666666",
        "fg-muted": "#999999",
        "fg-inverse": "#FFFFFF",
        "surface-primary": "#FFFFFF",
        "surface-secondary": "#F5F5F5",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "40px",
      },
    },
  },
  plugins: [],
};

export default config;
