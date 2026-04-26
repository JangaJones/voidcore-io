import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: {
          bg: "#070b14",
          panel: "rgba(13, 20, 36, 0.78)",
          edge: "#3f4e79",
          cyan: "#66d0ff",
          violet: "#8c7dff",
          silver: "#d5deef",
          gold: "#d9ba70",
          muted: "#93a3bf"
        }
      },
      fontFamily: {
        display: ["Cinzel", "serif"],
        body: ["Rajdhani", "sans-serif"]
      },
      boxShadow: {
        arcane: "0 0 0 1px rgba(102, 208, 255, 0.15), 0 20px 50px rgba(7, 11, 20, 0.6)"
      }
    }
  },
  plugins: []
} satisfies Config;
