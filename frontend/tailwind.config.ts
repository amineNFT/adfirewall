import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ember: {
          DEFAULT: '#f97316',
          soft: '#fb923c',
          dim: '#c2410c',
        },
        ink: {
          900: '#09090b',
          800: '#111113',
          700: '#18181b',
          600: '#27272a',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        ember: '0 0 0 1px rgba(249,115,22,0.35), 0 8px 30px rgba(249,115,22,0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
