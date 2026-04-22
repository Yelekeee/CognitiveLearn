/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          500: '#4f6ef7',
          600: '#4060f0',
          700: '#3350e0',
          900: '#1a2b9e',
        },
        navy: {
          950: '#07101f',
          900: '#0c1330',
          800: '#111c40',
          700: '#162151',
        },
        surface: '#f1f5f9',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 4px 20px 0 rgb(0 0 0 / 0.05)',
        'card-hover': '0 8px 30px 0 rgb(0 0 0 / 0.10)',
        'btn': '0 1px 2px 0 rgb(79 110 247 / 0.25), 0 2px 10px 0 rgb(79 110 247 / 0.18)',
        'btn-hover': '0 4px 14px 0 rgb(79 110 247 / 0.35)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
