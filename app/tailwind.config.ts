import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        signal: {
          bg:              '#F7F3EA',
          surface:         '#FFFDF8',
          'surface-muted': '#F1ECE2',
          mist:            '#EFEAE1',
          border:          '#DED6C8',
          'border-soft':   '#EAE3D6',
          text:            '#171714',
          'text-soft':     '#5F5B52',
          'text-muted':    '#7A7468',
          forest:          '#5F6F52',
          'forest-light':  '#EEF1EA',
          olive:           '#6F7D58',
          sage:            '#A8B39A',
          moss:            '#7B8A65',
          wood:            '#B8946F',
          oak:             '#C7A77A',
          earth:           '#8A684B',
          clay:            '#C99273',
          terracotta:      '#B8795B',
          'terracotta-light': '#F5EDE6',
          volcanic:        '#4D4A43',
          ash:             '#A7A196',
        },
      },
      fontFamily: {
        sans: [
          'var(--font-inter)',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft':       '0 8px 30px rgba(46,42,36,0.06)',
        'card':       '0 2px 8px rgba(46,42,36,0.05), 0 1px 2px rgba(46,42,36,0.04)',
        'card-hover': '0 12px 32px rgba(46,42,36,0.10), 0 2px 6px rgba(46,42,36,0.06)',
        'button':     '0 1px 3px rgba(46,42,36,0.10)',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.25s ease-out',
        'slide-up': 'slide-up 0.35s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      screens: { xs: '390px' },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
    },
  },
  plugins: [
    function ({ addUtilities }: { addUtilities: (u: Record<string, Record<string, string>>) => void }) {
      addUtilities({
        '.hide-scroll': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
        },
        '.hide-scroll::-webkit-scrollbar': {
          display: 'none',
        },
        '.glass-warm': {
          'backdrop-filter': 'blur(20px) saturate(140%)',
          '-webkit-backdrop-filter': 'blur(20px) saturate(140%)',
        },
      })
    },
  ],
}

export default config
