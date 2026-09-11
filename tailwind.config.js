/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#16A34A",
          secondary: "#1F2937",
          surface: "#F0FDF4",
          background: "#FFFFFF",
        }
      }
    },
  },
  plugins: [],
}
