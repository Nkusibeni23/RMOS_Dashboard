import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rm: {
          // Brand
          green: '#12A85E',
          'green-deep': '#0E8F4F', // hover / pressed
          'green-soft': '#E8F6EF', // tinted fills, selected states
          // Light surfaces
          canvas: '#F4F7F5', // page background
          panel: '#FFFFFF', // cards
          'panel-2': '#EEF3F0', // skeletons / subtle raised
          line: '#E4EAE6', // hairline borders
          // Text
          ink: '#0C1613', // primary text
          slate: '#5A655F', // secondary text
          // State
          danger: '#DC2626',
          'danger-soft': '#FDECEC',
          warn: '#B45309',
          'warn-soft': '#FBF0E3',
          // ── Back-compat aliases (old dark-theme class names now render light) ──
          black: '#F4F7F5', // page bg  → canvas
          fog: '#0C1613', // primary text → ink
          graphite: '#5A655F', // secondary text → slate
        },
        // legacy aliases kept so older references don't break
        rmsoft: {
          DEFAULT: '#0C1613',
          accent: '#12A85E',
          danger: '#DC2626',
          warn: '#B45309',
          ok: '#12A85E',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(12,22,19,0.04), 0 6px 20px rgba(12,22,19,0.06)',
        'card-hover': '0 2px 6px rgba(12,22,19,0.06), 0 16px 40px rgba(12,22,19,0.12)',
      },
    },
  },
  plugins: [],
};
export default config;
