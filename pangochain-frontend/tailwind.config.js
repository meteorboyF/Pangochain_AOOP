/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050A18',
          900: '#080E20',
          800: '#0D1526',
        },
        gold: {
          300: '#E8D5A3',
          400: '#D4B96A',
          500: '#C9A84C',
          600: '#A8893C',
        },
        slate: {
          750: '#1E2A3A',
          800: '#162030',
        },
        // Preserve some core semantic aliases but map them beautifully
        primary: {
          DEFAULT: '#C9A84C',
          50: '#0D1526',
          100: '#1E2A3A',
          500: '#C9A84C',
          600: '#A8893C',
          900: '#050A18',
        },
        accent: '#C9A84C',
        surface: {
          DEFAULT: '#050A18',
          card: '#080E20',
          muted: '#0D1526',
        },
        text: {
          primary: '#F5F0E8',
          secondary: '#8A9BB0',
          muted: '#64748B',
        },
        border: 'rgba(201,168,76,0.15)',
        success: '#1A5C4A',
        warning: '#C9A84C',
        error: '#8B1A1A',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', '"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        heading: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        body: ['Inter', '"DM Sans"', 'sans-serif'],
      },
      animation: {
        'shimmer': 'shimmer 2s linear infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'drift': 'drift 20s ease-in-out infinite',
        'draw-line': 'draw-line 1.5s ease-out forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0)' },
          '50%': { boxShadow: '0 0 20px 4px rgba(201,168,76,0.3)' },
        },
        'draw-line': {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'gold-sm': '0 0 8px rgba(201,168,76,0.2)',
        'gold-md': '0 0 20px rgba(201,168,76,0.3)',
        'gold-lg': '0 0 40px rgba(201,168,76,0.4)',
        'glass': 'inset 0 1px 0 rgba(255,255,255,0.05)',
        'card': '0 4px 30px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
