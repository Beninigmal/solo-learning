/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0a',
        neonBlue: '#00f3ff',
        darkGray: '#1a1a1a',
      }
    },
  },
  plugins: [],
}
