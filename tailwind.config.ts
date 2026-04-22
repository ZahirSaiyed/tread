import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class', // Always 'dark' class on <html>
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // TRS Brand
        'trs-gold': '#F5A623',
        'trs-gold-dark': '#D4891A',
        'trs-black': '#0F0F0F',
        'trs-charcoal': '#1C1C1E',
        'trs-slate': '#2C2C2E',
        // Status colors
        'status-idle': '#34C759',
        'status-enroute': '#FF9F0A',
        'status-onjob': '#007AFF',
        'status-complete': '#30D158',
        'status-urgent': '#FF3B30',
      },
      fontFamily: {
        display: ['var(--font-syne)', 'sans-serif'],
        sans: ['var(--font-dm-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      fontSize: {
        xs: '11px',
        sm: '13px',
        base: '15px',
        lg: '17px',
        xl: '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      // Minimum touch targets
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
}

export default config
