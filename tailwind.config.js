/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0b0b0f",
        panel: "#15151c",
        panel2: "#1c1c26",
        line: "#2a2a38",
        primary: "#8b5cf6",
        indigo2: "#6366f1",
        accent: "#60a5fa",
        gold: "#d4af37",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
