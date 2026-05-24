import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdfa', 100: '#ccfbf1', 200: '#99f6e4',
          400: '#2dd4bf', 500: '#14b8a6', 600: '#0d9488',
          700: '#0f766e', 900: '#134e4a',
        },
        surface: { DEFAULT: '#ffffff', muted: '#f8fafc', border: '#e2e8f0' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      screens: { xs: '390px' },
    },
  },
  plugins: [
    function ({ addUtilities }: { addUtilities: (u: Record<string, Record<string, string>>) => void }) {
      addUtilities({
        '.no-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
        },
        '.no-scrollbar::-webkit-scrollbar': {
          display: 'none',
        },
      })
    },
  ],
}
export default config
