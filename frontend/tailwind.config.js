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
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          'system-ui',
          'sans-serif'
        ]
      },
      maxWidth: {
        'mobile': '480px',
        'mobile-lg': '600px'
      },
      minHeight: {
        'touch': '24px'
      },
      minWidth: {
        'touch': '24px'
      }
    },
  },
  plugins: [],
}
