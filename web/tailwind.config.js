/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Canvas + elevated surfaces. Values resolve to CSS variables defined in
        // src/styles/globals.css so the whole system is themeable from one place.
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        "canvas-2": "rgb(var(--canvas-2) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        "surface-3": "rgb(var(--surface-3) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--ink-soft) / <alpha-value>)",
        "ink-muted": "rgb(var(--ink-muted) / <alpha-value>)",
        "ink-faint": "rgb(var(--ink-faint) / <alpha-value>)",
        teal: {
          DEFAULT: "rgb(var(--teal) / <alpha-value>)",
          bright: "rgb(var(--teal-bright) / <alpha-value>)",
          deep: "rgb(var(--teal-deep) / <alpha-value>)",
        },
        hairline: "rgb(var(--hairline) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
      },
      fontFamily: {
        display: ["Clash Display", "Geist Variable", "system-ui", "sans-serif"],
        sans: ["Geist Variable", "system-ui", "-apple-system", "sans-serif"],
        mono: ["Geist Mono Variable", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        // Concentric squircle scale. Outer shells use the large radii; inner
        // cores subtract the shell padding for true concentric curves.
        squircle: "1.5rem", // 24px — default card shell
        "squircle-lg": "2rem", // 32px — hero / feature shells
        "squircle-xl": "2.5rem", // 40px — section-spanning shells
      },
      boxShadow: {
        // Crisp, NEUTRAL depth — no teal glow (per the design-taste "LILA RULE").
        // A faint inset top highlight + a tight, low-opacity dark shadow reads as
        // machined hardware, not AI glow. The "glow*" keys are kept for API compat
        // but are now subtle neutral elevation, not coloured glow.
        "card": "0 1px 0 0 rgb(var(--inset-top) / 0.05) inset, 0 10px 30px -22px rgb(0 0 0 / 0.7)",
        "card-hover": "0 1px 0 0 rgb(var(--inset-top) / 0.07) inset, 0 16px 40px -24px rgb(0 0 0 / 0.78)",
        "inset-top": "0 1px 0 0 rgb(var(--inset-top) / 0.06) inset",
        "glow": "0 2px 10px -3px rgb(0 0 0 / 0.5)",
        "glow-soft": "0 10px 28px -18px rgb(0 0 0 / 0.6)",
        "pill": "0 1px 0 0 rgb(255 255 255 / 0.06) inset, 0 8px 20px -12px rgb(0 0 0 / 0.55)",
      },
      backgroundImage: {
        "teal-mesh":
          "radial-gradient(60% 50% at 50% 0%, rgb(var(--teal) / 0.10), transparent 70%), radial-gradient(40% 40% at 85% 20%, rgb(var(--teal-bright) / 0.06), transparent 70%)",
      },
      letterSpacing: {
        tightest: "-0.045em",
        eyebrow: "0.22em",
      },
      zIndex: {
        nav: "var(--z-nav)",
        overlay: "var(--z-overlay)",
        grain: "var(--z-grain)",
        toast: "var(--z-toast)",
      },
      transitionTimingFunction: {
        // The signature LockdIN motion curve (iOS drawer feel).
        smooth: "cubic-bezier(0.32, 0.72, 0, 1)",
        "out-strong": "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out-strong": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.55", transform: "scale(0.9)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.32,0.72,0,1) both",
        "pulse-soft": "pulse-soft 2.2s cubic-bezier(0.4,0,0.6,1) infinite",
        shimmer: "shimmer 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        float: "float 7s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
