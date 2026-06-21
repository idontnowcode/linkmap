import type { Config } from 'tailwindcss'

export default {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rail: {
          DEFAULT: '#1B2030',
          hover: '#262C3E',
          active: '#2E3650'
        },
        canvas: '#FFFFFF',
        list: '#F8FAFC',
        ink: {
          strong: '#0F172A',
          muted: '#64748B',
          dark: '#E2E8F0',
          'dark-muted': '#94A3B8'
        },
        line: '#E5E7EB',
        brand: {
          DEFAULT: '#3B82F6',
          hover: '#2563EB'
        },
        node: '#8B5CF6',
        tag: {
          ai: '#3B82F6',
          dev: '#22C55E',
          prod: '#F97316',
          design: '#A855F7',
          biz: '#EAB308',
          research: '#14B8A6'
        }
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px'
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.06)',
        pop: '0 8px 24px rgba(15,23,42,.12)'
      },
      fontFamily: {
        sans: ['Inter', 'Pretendard', 'system-ui', 'sans-serif']
      },
      fontSize: {
        logo: ['18px', { lineHeight: '24px', fontWeight: '700' }],
        h: ['15px', { lineHeight: '20px', fontWeight: '600' }],
        body: ['13px', { lineHeight: '18px' }],
        sm: ['12px', { lineHeight: '16px' }],
        label: ['11px', { lineHeight: '14px', fontWeight: '600', letterSpacing: '0.04em' }]
      }
    }
  },
  plugins: []
} satisfies Config
