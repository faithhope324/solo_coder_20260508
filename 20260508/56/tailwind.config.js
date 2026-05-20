/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-dark': '#0a0e1a',
        'space-blue': '#1a2744',
        'planet-blue': '#64b5f6',
        'energy-orange': '#ff9800',
        'com-green': '#4caf50',
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'sans-serif'],
        'inter': ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(100, 181, 246, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(100, 181, 246, 0.8)' },
        },
      },
    },
  },
  plugins: [],
}
