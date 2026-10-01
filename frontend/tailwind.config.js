/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c1915",
        paper: "#f4efe4",
        clay: "#c45c26",
        moss: "#2f4f3e",
        sand: "#e7dcc8"
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Outfit", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 16px 40px -24px rgba(28, 25, 21, 0.45)"
      }
    }
  },
  plugins: []
};
