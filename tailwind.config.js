/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './templates/**/*.html',
    '../../../templates_forge/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        // Surface — paper tones (from --bg, --bg-2, --bg-3)
        paper: {
          0: 'var(--bg)',      // #F4EEE2
          1: 'var(--bg-2)',    // #ECE3D0
          2: 'var(--bg-3)',    // #E2D6BB
        },
        // Ink — text and borders (from --ink, --ink-2, --ink-3, --ink-4)
        ink: {
          DEFAULT: 'var(--ink)',    // #141210
          50: 'var(--ink-4)',       // #8A8073 (lightest)
          100: 'var(--ink-3)',      // #5C544A
          200: 'var(--ink-2)',      // #2A2723
          300: 'var(--ink)',        // #141210 (darkest)
        },
        // Signature — marigold yellow (from --yes, --yes-deep, --yes-soft)
        gold: {
          soft: 'var(--yes-soft)',   // #FFE7A0
          DEFAULT: 'var(--yes)',     // #FFC629
          deep: 'var(--yes-deep)',   // #E5A800
        },
        // Alert — tomato red (from --tomato, --tomato-deep)
        tomato: {
          DEFAULT: 'var(--tomato)',       // #E5482A
          deep: 'var(--tomato-deep)',     // #B83218
        },
        // Dark stage backgrounds (from --night, --night-soft)
        night: {
          DEFAULT: 'var(--night)',        // #141210
          soft: 'var(--night-soft)',      // #1E1B17
        },
      },
      fontFamily: {
        display: "var(--f-display)", // 'Archivo Black', 'Archivo', system-ui, sans-serif
        sans: "var(--f-sans)",       // 'Archivo', system-ui, sans-serif
        body: "var(--f-body)",       // 'Manrope', system-ui, sans-serif
        mono: "var(--f-mono)",       // 'DM Mono', ui-monospace, monospace
      },
      borderRadius: {
        card: 'var(--r-1)',  // 4px (tight corners)
        DEFAULT: 'var(--r-2)', // 10px (standard card)
        pill: 'var(--r-pill)', // 999px (pills/circles)
      },
      spacing: {
        // 4px base scale: s-1 (4px) through s-9 (96px)
        1: 'var(--s-1)',   // 4px
        2: 'var(--s-2)',   // 8px
        3: 'var(--s-3)',   // 12px
        4: 'var(--s-4)',   // 16px
        5: 'var(--s-5)',   // 24px
        6: 'var(--s-6)',   // 32px
        7: 'var(--s-7)',   // 48px
        8: 'var(--s-8)',   // 64px
        9: 'var(--s-9)',   // 96px
      },
      // Additional layout helpers
      maxWidth: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
  },
  plugins: [],
};
