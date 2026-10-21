/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'wa-green': '#25D366',
        'wa-teal': '#00A884',
        'wa-teal-dark': '#008069',
        'wa-light-bg': '#EFEAE2',
        'wa-light-panel': '#FFFFFF',
        'wa-light-bubble': '#FFFFFF',
        'wa-light-sent': '#D9FDD3',
        'wa-light-header': '#F0F2F5',
        'wa-light-border': '#E9EDEF',
        'wa-dark-bg': '#0B141A',
        'wa-dark-panel': '#111B21',
        'wa-dark-bubble': '#202C33',
        'wa-dark-sent': '#005C4B',
        'wa-dark-header': '#202C33',
        'wa-dark-border': '#222D34',
        'wa-dark-text': '#E9EDEF',
        'wa-dark-muted': '#8696A0',
        'wa-blue-tick': '#53BDEB'
      }
    },
  },
  plugins: [],
}
