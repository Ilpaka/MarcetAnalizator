/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Trading colors
        'profit': '#22c55e',
        'loss': '#ef4444',
        'neutral': '#6b7280',

        // UI colors
        'primary': {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },

        // Chart colors
        'chart': {
          'up': '#22c55e',
          'down': '#ef4444',
          'volume': '#3b82f6',
          'ma': '#f59e0b',
          'bb': '#8b5cf6',
        },

        // Background
        'bg': {
          'primary': '#0f0f0f',
          'secondary': '#1a1a1a',
          'tertiary': '#252525',
          'elevated': '#2a2a2a',
        },

        // Border
        'border': {
          'primary': '#333333',
          'secondary': '#444444',
        }
      },

      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },

      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },

      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgb(34 197 94 / 0.5)' },
          '100%': { boxShadow: '0 0 20px rgb(34 197 94 / 0.8)' },
        }
      }
    },
  },
  plugins: [],
}
