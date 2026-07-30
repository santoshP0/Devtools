/** @type {import('tailwindcss').Config} */
export default {
  // app toggles theme via data-theme on <html>, so dark: variants follow that
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}
