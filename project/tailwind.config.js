/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        // Custom colors can be added here
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  // Note: In Tailwind v4, content scanning is handled by @source directives in CSS files
  // The @source directives are already in index.css:
  // @source "./index.html";
  // @source "./**/*.{js,ts,jsx,tsx}";
}
