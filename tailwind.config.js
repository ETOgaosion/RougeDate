/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ember: "#ff8c57",
        slateMist: "#c8d3f0",
      },
      boxShadow: {
        glow: "0 0 28px rgba(255, 140, 87, 0.38)",
      },
      backgroundImage: {
        "line-fade": "linear-gradient(90deg, rgba(255,255,255,0.16), rgba(255,255,255,0.03))",
      },
    },
  },
  plugins: [],
};
