/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Open Sans", "ui-sans-serif", "sans-serif"],
        body: ["Open Sans", "ui-sans-serif", "sans-serif"]
      },
      colors: {
        ink: {
          900: "#0b1220",
          800: "#101a2a",
          700: "#1a2740",
          600: "#22314d"
        },
        mint: {
          500: "#24d3b6",
          600: "#1fb6a0"
        },
        ocean: {
          500: "#2b7fff",
          600: "#2265cc"
        },
        sand: {
          100: "#f6f7fb",
          200: "#eff1f7"
        }
      },
      boxShadow: {
        card: "0 24px 60px rgba(11, 18, 32, 0.08)",
        soft: "0 16px 40px rgba(11, 18, 32, 0.06)"
      },
      keyframes: {
        fadeSlide: {
          "0%": { opacity: 0, transform: "translateY(16px)" },
          "100%": { opacity: 1, transform: "translateY(0)" }
        },
        pulseSoft: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.6 }
        }
      },
      animation: {
        "fade-slide": "fadeSlide 0.45s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
