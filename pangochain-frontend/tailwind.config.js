/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E3A5F',
          50: '#EEF2F8',
          100: '#D0DCF0',
          200: '#A1B9E1',
          300: '#7297D2',
          400: '#4374C3',
          500: '#1E3A5F',
          600: '#182F4C',
          700: '#122439',
          800: '#0C1926',
          900: '#060D13',
        },
        accent: '#2563EB',
        surface: {
          DEFAULT: '#F9FAFB',
          card: '#FFFFFF',
          muted: '#F3F4F6',
        },
        text: {
          primary: '#111827',
          secondary: '#374151',
          muted: '#6B7280',
        },
        border: '#E5E7EB',
        success: '#059669',
        warning: '#D97706',
        error: '#DC2626',
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'DM Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [],
}
