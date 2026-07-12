/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F5F7',
        ink: {
          DEFAULT: '#1D2733',
          50: '#F4F5F7',
          100: '#E3E6EA',
          200: '#C3C9D2',
          300: '#9AA3B1',
          400: '#6B7385',
          500: '#4A5163',
          600: '#343B4C',
          700: '#242A38',
          800: '#1D2733',
          900: '#141B24',
        },
        moss: {
          DEFAULT: '#2F6F62',
          50: '#EAF3F0',
          100: '#CFE4DC',
          400: '#3F8874',
          500: '#2F6F62',
          600: '#245A4F',
        },
        rose: {
          DEFAULT: '#C1495B',
          100: '#F3D9DD',
          400: '#CC6577',
          500: '#C1495B',
        },
        amber: {
          DEFAULT: '#C98A3B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(29,39,51,0.06), 0 4px 12px rgba(29,39,51,0.06)',
        pop: '0 8px 24px rgba(29,39,51,0.16)',
      },
    },
  },
  plugins: [],
}
