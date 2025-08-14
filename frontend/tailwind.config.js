// tailwind.config.js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#123456',
        accentRed: '#ff4d4d',
        accentBlue: '#4da6ff',
        accentGreen: '#33cc99',
      }
    }
  },
  plugins: [],
}
