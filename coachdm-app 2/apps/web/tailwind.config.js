/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        'bg-elevated': '#141414',
        surface: '#171717',
        'surface-elevated': '#1F1F1F',
        primary: {
          DEFAULT: '#D4AF37',
          dim: '#A8862A',
          light: '#F4D778',
        },
        accent: {
          protein: '#EF4444',
          carbs: '#38BDF8',
          fat: '#A78BFA',
          fiber: '#10B981',
        },
        border: {
          DEFAULT: '#27272A',
          subtle: '#1F1F1F',
          strong: '#3F3F46',
        },
        muted: {
          DEFAULT: '#A1A1AA',
          dim: '#71717A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.05em',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'glow': 'glow 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212,175,55,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(212,175,55,0.6)' },
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #F4D778 50%, #D4AF37 100%)',
        'dark-radial': 'radial-gradient(ellipse at top, #1a1408 0%, #0A0A0A 60%)',
      },
    },
  },
  plugins: [],
};
