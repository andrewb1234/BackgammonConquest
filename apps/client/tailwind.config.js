/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surface scale — see AESTHETIC_NARRATIVE.md §2.1
        surface: "#10141a",
        "surface-container-lowest": "#0a0e14",
        "surface-container-low": "#181c22",
        "surface-container": "#1c2026",
        "surface-container-high": "#262a31",
        "surface-container-highest": "#31353c",
        "surface-bright": "#353940",
        "surface-dim": "#10141a",
        "surface-variant": "#31353c",

        // Accents — §2.2
        primary: "#8fd6ff",
        "primary-container": "#00bfff",
        "primary-fixed": "#c3e8ff",
        "primary-fixed-dim": "#7ad0ff",
        secondary: "#ffb77d",
        "secondary-container": "#fd8b00",
        "secondary-fixed": "#ffdcc3",
        "secondary-fixed-dim": "#ffb77d",
        tertiary: "#f1cb00",
        "tertiary-container": "#d1b000",
        "tertiary-fixed": "#ffe16d",
        "tertiary-fixed-dim": "#e9c400",
        error: "#ffb4ab",
        "error-container": "#93000a",

        // On-tokens
        "on-surface": "#dfe2eb",
        "on-surface-variant": "#bcc8d1",
        "on-primary": "#003549",
        "on-primary-container": "#004a65",
        "on-primary-fixed": "#001e2c",
        "on-primary-fixed-variant": "#004c69",
        "on-secondary": "#4d2600",
        "on-secondary-container": "#603100",
        "on-secondary-fixed": "#2f1500",
        "on-secondary-fixed-variant": "#6e3900",
        "on-tertiary": "#3a3000",
        "on-tertiary-container": "#524400",
        "on-tertiary-fixed": "#221b00",
        "on-tertiary-fixed-variant": "#544600",
        "on-error": "#690005",
        "on-error-container": "#ffdad6",
        "on-background": "#dfe2eb",

        outline: "#87929b",
        "outline-variant": "#3d4850",
      },
      fontFamily: {
        headline: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        label: ["'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0rem",
        none: "0",
        sm: "0",
        md: "0",
        lg: "0",
        xl: "0",
        "2xl": "0",
        "3xl": "0",
        full: "9999px",
      },
      keyframes: {
        "orbital-spin": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        "orbital-spin-reverse": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(-360deg)" },
        },
        "ticker-scroll": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "orbital-spin": "orbital-spin 20s linear infinite",
        "orbital-spin-reverse": "orbital-spin-reverse 15s linear infinite",
        "ticker-scroll": "ticker-scroll 25s linear infinite",
      },
    },
  },
  plugins: [],
};

