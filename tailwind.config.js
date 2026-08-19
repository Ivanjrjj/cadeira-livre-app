/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--tenant-ink)",
        cream: "var(--tenant-cream)",
        accent: "var(--tenant-red)",
        navy: "var(--tenant-navy)",
        brass: "var(--tenant-brass)",
      },
    },
  },
  plugins: [],
};
