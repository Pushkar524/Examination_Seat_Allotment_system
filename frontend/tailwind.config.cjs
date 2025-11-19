module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        brandTeal: '#97EDEB',
        brandPink: '#e87b7b',
        softGray: '#e3e3e3',
        cyanLight: '#bff0f0'
      }
    }
  },
  plugins: []
}
