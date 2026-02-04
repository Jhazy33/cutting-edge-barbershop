/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: "#CC0000",
        "background-light": "#F8F8F8",
        "background-dark": "#0A0A0A",
        "accent-dark": "#1A1A1A",
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
