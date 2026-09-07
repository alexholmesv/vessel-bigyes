/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["../templates/**/*.html"],
  theme: {
    colors: {
      /* Surface — warm paper */
      bg: "var(--bg)",
      "bg-2": "var(--bg-2)",
      "bg-3": "var(--bg-3)",

      /* Ink — text & borders */
      ink: "var(--ink)",
      "ink-2": "var(--ink-2)",
      "ink-3": "var(--ink-3)",
      "ink-4": "var(--ink-4)",

      /* Signature — marigold */
      yes: "var(--yes)",
      "yes-deep": "var(--yes-deep)",
      "yes-soft": "var(--yes-soft)",

      /* Secondary — tomato */
      tomato: "var(--tomato)",
      "tomato-deep": "var(--tomato-deep)",

      /* Stage — dark */
      night: "var(--night)",
      "night-soft": "var(--night-soft)",

      /* Transparent */
      transparent: "transparent",
    },
    fontFamily: {
      display: ["var(--f-display)", "system-ui", "sans-serif"],
      sans: ["var(--f-sans)", "system-ui", "sans-serif"],
      body: ["var(--f-body)", "system-ui", "sans-serif"],
      mono: ["var(--f-mono)", "ui-monospace", "monospace"],
    },
    spacing: {
      "1": "var(--s-1)",
      "2": "var(--s-2)",
      "3": "var(--s-3)",
      "4": "var(--s-4)",
      "5": "var(--s-5)",
      "6": "var(--s-6)",
      "7": "var(--s-7)",
      "8": "var(--s-8)",
      "9": "var(--s-9)",
    },
    borderRadius: {
      "1": "var(--r-1)",
      "2": "var(--r-2)",
      pill: "var(--r-pill)",
    },
  },
  plugins: [],
};
