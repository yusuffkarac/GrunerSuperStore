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
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
        },
        theme: {
          'header-bg': 'var(--color-header-bg)',
          'header-text': 'var(--color-header-text)',
          'button-cart': 'var(--color-button-cart)',
          'button-favorite': 'var(--color-button-favorite)',
          'button-favorite-active': 'var(--color-button-favorite-active)',
          'text-price': 'var(--color-text-price)',
          'text-primary': 'var(--color-text-primary)',
          'text-secondary': 'var(--color-text-secondary)',
          'bg-card': 'var(--color-bg-card)',
          'bg-page': 'var(--color-bg-page)',
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
