/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './App.tsx', './components/**/*.{ts,tsx}', './hooks/**/*.{ts,tsx}', './types.ts'],
  theme: {
    extend: {
      colors: {
        gray: {
          950: '#1d2029',
          900: '#242832',
          800: '#2f3441',
          700: '#414755',
          600: '#6c7282',
          500: '#9fa6b8',
          400: '#b8c0d1',
          300: '#d4d9e3',
          200: '#eef2f9',
          100: '#f9fafb',
        },
        indigo: {
          600: '#6952de',
          500: '#7c67e8',
        },
        amber: {
          400: '#f5b945',
        },
      },
    },
  },
  plugins: [],
};
