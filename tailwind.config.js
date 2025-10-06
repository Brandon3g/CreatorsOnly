/** @type {import('tailwindcss').Config} */
import daisyui from "daisyui";
import themes from "daisyui/src/theming/themes.js";

const { light, dark } = themes;

export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./context/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
    "./services/**/*.{js,jsx,ts,tsx}",
    "./icons/**/*.{js,jsx,ts,tsx}",
    "./data/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  theme: { extend: {} },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        light: {
          ...light,
          primary: "#7C3AED",
          "primary-focus": "#6D28D9",
          "primary-content": "#ffffff",
        },
      },
      {
        dark: {
          ...dark,
          primary: "#7C3AED",
          "primary-focus": "#6D28D9",
          "primary-content": "#ffffff",
        },
      },
    ],
  },
};
