/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#612bd3',
        secondary: '#d82d7e',
        background: {
          DEFAULT: '#0c0a09',
          light: '#ffffff',
        },
        foreground: {
          DEFAULT: '#ffffff',
          light: '#000000',
        },
      },
    },
  },
  plugins: [],
}
