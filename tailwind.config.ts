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
      // Flat design — no drop shadows. Cards read via border + panel background only.
      boxShadow: {
        card: 'none',
        'card-hover': 'none',
      },
    },
  },
  plugins: [],
};
export default config;
