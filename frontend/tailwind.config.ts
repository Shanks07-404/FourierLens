import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        osc: {
          bg: '#0B1220',
          panel: '#131F30',
          card: '#101B2B',
          grid: '#1B2A3A',
          border: '#22364B',
          text: '#E8F1EC',
          slate: '#7F93A6',
          green: '#5CE6B0',
          'green-glow': 'rgba(92, 230, 176, 0.25)',
          coral: '#FF8A5C',
          'coral-glow': 'rgba(255, 138, 92, 0.25)',
          dim: '#4A5B6D',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'phosphor-green': '0 0 15px rgba(92, 230, 176, 0.4)',
        'phosphor-coral': '0 0 15px rgba(255, 138, 92, 0.4)',
        'screen-glow': 'inset 0 0 60px rgba(0, 0, 0, 0.6)',
      },
    },
  },
  plugins: [],
} satisfies Config;
