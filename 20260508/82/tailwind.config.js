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
        primary: {
          50: '#e6fffa',
          100: '#b3fff0',
          200: '#80ffe5',
          300: '#4dffdb',
          400: '#1affd1',
          500: '#64ffda',
          600: '#00cc99',
          700: '#009973',
          800: '#00664d',
          900: '#003326',
        },
        accent: {
          50: '#f5e6ff',
          100: '#e6b3ff',
          200: '#d680ff',
          300: '#c74dff',
          400: '#b81aff',
          500: '#bd93f9',
          600: '#9933cc',
          700: '#732699',
          800: '#4d1a66',
          900: '#260d33',
        },
        dark: {
          50: '#e6e9f0',
          100: '#b3bcd4',
          200: '#808fb8',
          300: '#4d629c',
          400: '#1a3580',
          500: '#0a192f',
          600: '#081426',
          700: '#060f1c',
          800: '#040a13',
          900: '#020509',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(100, 255, 218, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(100, 255, 218, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};
