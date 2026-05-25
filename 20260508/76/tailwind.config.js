/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'space': {
          900: '#0B1120',
          800: '#0F172A',
          700: '#1E293B',
          600: '#334155',
        },
        'status': {
          good: '#10B981',
          warning: '#F59E0B',
          critical: '#EF4444',
        },
        'neon': {
          cyan: '#06B6D4',
          purple: '#8B5CF6',
          blue: '#3B82F6',
        }
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.4)',
        'glow-yellow': '0 0 20px rgba(245, 158, 11, 0.4)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.5)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breath': 'breath 2s ease-in-out infinite',
      },
      keyframes: {
        breath: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(239, 68, 68, 0.5)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 40px rgba(239, 68, 68, 0.8)' },
        }
      }
    },
  },
  plugins: [],
};
