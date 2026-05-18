import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15161A",
        panel: "#F7F4EE",
        signal: "#0B3D91",
        danger: "#C7352B",
        success: "#2E7D4F",
        gold: "#B38B21"
      },
      boxShadow: {
        studio: "0 24px 70px rgba(16, 24, 32, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
