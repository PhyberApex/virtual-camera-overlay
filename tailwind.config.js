/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Make sure Tailwind processes these specific files
  purge: [
    './src/**/*.vue',
    './src/**/*.js',
    './index.html',
  ],
}