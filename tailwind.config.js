/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#16A34A", // Professional Green (Buttons, main headers, active states)
          secondary: "#1F2937", // Dark Gray (Text, admin sidebar, taaki green ke saath contrast achha bane)
          accent: "#86EFAC", // Soft Light Green (Hover effects, row highlights ya subtle borders)
          background: "#FFFFFF", // Pure White (Poore app ka clean base)
          surface: "#F0FDF4", // Very Light Green Tint (Cards, ya quiz sections ke background ke liye)
          danger: "#DC2626", // Red (Time up, warnings, ya destructive actions)
          success: "#22C55E", // Bright Green (Correct answers ke liye)
        }
      }
    },
  },
  plugins: [],
}