import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#3B82F6",
          light: "#EFF6FF",
          dark: "#1D4ED8",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Pretendard", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
