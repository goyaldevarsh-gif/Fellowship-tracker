/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0f2a43', 700: '#16385a', 600: '#1d4670', 100: '#e4ebf3', 50: '#f1f5f9' },
        teal: { DEFAULT: '#0e8f87', 600: '#0b7a73', 100: '#d9f0ee', 50: '#ecf8f7' },
        paper: '#faf8f5',
        line: '#e6e2db',
      },
      fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      boxShadow: { soft: '0 1px 2px rgba(15,42,67,.04), 0 4px 14px rgba(15,42,67,.06)' },
    },
  },
  plugins: [],
}
