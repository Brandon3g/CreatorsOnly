/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui";

export default {
  content: ["./index.html", "./**/*.{ts,tsx,js,jsx}"],
  darkMode: "class",                 // enable class-based dark mode
  theme: { extend: {} },
  plugins: [daisyui],
  daisyui: {
    themes: ["light", "dark"],       // use DaisyUI’s built-ins (brings back purple)
  },
};
