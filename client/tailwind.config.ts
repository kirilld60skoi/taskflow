import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#132238",
        mist: "#eef4ff",
        accent: "#ff7a59",
        pine: "#0f766e"
      },
      fontFamily: {
        sans: ["Segoe UI", "sans-serif"]
      },
      boxShadow: {
        soft: "0 20px 45px rgba(19, 34, 56, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;
