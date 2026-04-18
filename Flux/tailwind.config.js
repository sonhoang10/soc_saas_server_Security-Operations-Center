/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./flux-portal-access/admin.html",
  ],
  theme: {
    extend: {
      colors: {
        sbBg: '#1c1c1c',
        sbCard: '#2a2a2a',
        sbBorder: '#3e3e3e',
        sbTeal: '#3ecf8e',
        sbRed: '#f87171',
        sbText: '#ededed',
        sbSubText: '#a0a0a0',
      },
    },
  },
  plugins: [],
}