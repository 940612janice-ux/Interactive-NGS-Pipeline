/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: '#4da3ff',
        'accent-2': '#ffb84d',
        'text-light': '#e8eef5',
        'text-dim': '#9fb0c3',
        'card-bg': '#2c3a4b',
        'bg-dark': '#0f1520',
        'sidebar-bg': '#1b2430',
        'sidebar-bg-2': '#232f3e',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Microsoft JhengHei', 'sans-serif'],
        mono: ['Consolas', 'Courier New', 'monospace'],
      },
      animation: {
        'helix-sway': 'helixSway 3s ease-in-out infinite alternate',
        'seq-float': 'seqFloat 6s ease-in-out infinite',
        'dna-pulse': 'dnaPulse 1.6s ease-in-out infinite',
        'card-pulse': 'cardPulse 1s ease 3',
        'fade-up': 'fadeUp 0.5s ease both',
        'slide-in': 'slideIn 0.4s ease both',
        'card-pop': 'cardPop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.2) both',
        'overlay-in': 'overlayIn 0.35s ease both',
        'congrats-pop': 'congratsPop 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.2) both',
        'blink': 'blink 0.8s step-end infinite',
        'shake': 'shake 0.4s ease',
      },
      keyframes: {
        helixSway: {
          'from': { transform: 'translateX(-6px) skewX(-8deg)' },
          'to': { transform: 'translateX(6px) skewX(8deg)' },
        },
        seqFloat: {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '50%': { transform: 'translateY(-18px)', opacity: '0.9' },
        },
        dnaPulse: {
          '0%, 100%': { transform: 'scaleY(0.5)', opacity: '0.25' },
          '50%': { transform: 'scaleY(1)', opacity: '0.9' },
        },
        cardPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 184, 77, 0)' },
          '50%': { boxShadow: '0 0 0 6px rgba(255, 184, 77, 0.4)' },
        },
        fadeUp: {
          'from': { opacity: '0', transform: 'translateY(22px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          'from': { opacity: '0', transform: 'translateX(36px)' },
          'to': { opacity: '1', transform: 'translateX(0)' },
        },
        cardPop: {
          'from': { opacity: '0', transform: 'scale(0.82) translateY(30px)' },
          'to': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        overlayIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        congratsPop: {
          'from': { opacity: '0', transform: 'scale(0.75) translateY(40px)' },
          'to': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-8px)' },
          '75%': { transform: 'translateX(8px)' },
        },
      },
    },
  },
  plugins: [],
}