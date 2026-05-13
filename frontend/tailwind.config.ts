import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1280px' },
    },
    extend: {
      colors: {
        bg: 'oklch(var(--bg) / <alpha-value>)',
        fg: 'oklch(var(--fg) / <alpha-value>)',
        muted: {
          DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
          foreground: 'oklch(var(--muted-fg) / <alpha-value>)',
        },
        border: 'oklch(var(--border) / <alpha-value>)',
        primary: {
          DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
          foreground: 'oklch(var(--primary-fg) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
          foreground: 'oklch(var(--accent-fg) / <alpha-value>)',
        },
        destructive: 'oklch(var(--destructive) / <alpha-value>)',
        'sidebar-bg': 'oklch(var(--sidebar-bg) / <alpha-value>)',
        glow: 'oklch(var(--glow) / <alpha-value>)',
        surface: 'oklch(var(--surface) / <alpha-value>)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse-dot 2s ease-in-out infinite',
        'breathing': 'breathing 3s ease-in-out infinite',
        'scanline': 'scanline-scroll 8s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
