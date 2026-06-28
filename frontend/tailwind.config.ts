import type { Config } from 'tailwindcss';

// ============================================================
//  Konfigurasi Tailwind CSS — tema formal instansi pemerintah
//  Warna utama: biru (primary) & hijau (accent/sukses).
// ============================================================

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1400px' },
    },
    extend: {
      screens: {
        xs: '420px',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Warna khusus instansi
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#1e3a8a',
          700: '#1e3a5f',
          800: '#172554',
          900: '#0f172a',
        },
        hijau: {
          500: '#16a34a',
          600: '#15803d',
          700: '#166534',
        },
        // ============================================================
        //  Token desain Material (SIPP-BMN) — dipakai oleh markup
        //  hasil generator desain. Selaras dengan palet biru-hijau.
        // ============================================================
        tertiary: {
          DEFAULT: '#003272',
          container: '#00489e',
        },
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        outline: {
          DEFAULT: '#757684',
          variant: '#c4c5d5',
        },
        surface: {
          DEFAULT: '#f8f9ff',
          dim: '#cbdbf5',
          bright: '#f8f9ff',
          variant: '#d3e4fe',
          tint: '#3755c3',
          'container-lowest': '#ffffff',
          'container-low': '#eff4ff',
          container: '#e5eeff',
          'container-high': '#dce9ff',
          'container-highest': '#d3e4fe',
        },
        'primary-fixed': '#dde1ff',
        'primary-fixed-dim': '#b8c4ff',
        'primary-container': '#1e40af',
        'secondary-container': '#6cf8bb',
        'secondary-fixed': '#6ffbbe',
        'secondary-fixed-dim': '#4edea3',
        'tertiary-fixed': '#d8e2ff',
        'tertiary-fixed-dim': '#adc6ff',
        'tertiary-container': '#00489e',
        'inverse-primary': '#b8c4ff',
        'inverse-surface': '#213145',
        'inverse-on-surface': '#eaf1ff',
        'on-background': '#0b1c30',
        'on-surface': '#0b1c30',
        'on-surface-variant': '#444653',
        'on-primary': '#ffffff',
        'on-primary-container': '#a8b8ff',
        'on-primary-fixed': '#001453',
        'on-primary-fixed-variant': '#173bab',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#00714d',
        'on-secondary-fixed': '#002113',
        'on-secondary-fixed-variant': '#005236',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#9cbbff',
        'on-tertiary-fixed': '#001a42',
        'on-tertiary-fixed-variant': '#004395',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      spacing: {
        'stack-sm': '8px',
        'stack-md': '16px',
        'stack-lg': '32px',
        gutter: '24px',
        'margin-mobile': '16px',
        'margin-desktop': '40px',
        'container-max': '1280px',
      },
      maxWidth: {
        'container-max': '1280px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        jakarta: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        // Token tipografi desain (family)
        'display-lg': ['var(--font-jakarta)', 'Plus Jakarta Sans', 'sans-serif'],
        'headline-lg': ['var(--font-jakarta)', 'Plus Jakarta Sans', 'sans-serif'],
        'headline-lg-mobile': ['var(--font-jakarta)', 'Plus Jakarta Sans', 'sans-serif'],
        'headline-md': ['var(--font-jakarta)', 'Plus Jakarta Sans', 'sans-serif'],
        'body-lg': ['var(--font-inter)', 'Inter', 'sans-serif'],
        'body-md': ['var(--font-inter)', 'Inter', 'sans-serif'],
        'label-md': ['var(--font-inter)', 'Inter', 'sans-serif'],
        'label-sm': ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['48px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['32px', { lineHeight: '1.3', fontWeight: '700' }],
        'headline-lg-mobile': ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '1.4', letterSpacing: '0.01em', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      boxShadow: {
        soft: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
        card: '0 1px 3px 0 rgb(16 24 40 / 0.06), 0 8px 24px -8px rgb(16 24 40 / 0.10)',
        elevated: '0 12px 32px -8px rgb(16 24 40 / 0.18)',
        brand: '0 10px 30px -10px rgb(30 58 138 / 0.45)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        // Transisi masuk antar halaman: fade + slide-up halus.
        'page-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.4s ease-out both',
        'fade-up': 'fade-up 0.45s cubic-bezier(0.22, 1, 0.36, 1) both',
        // Transisi antar halaman: fade + slide-up halus.
        // Fill-mode `backwards` (bukan `both`) agar transform tidak tertinggal
        // setelah animasi selesai — jika tertinggal, ia merusak `position: sticky`
        // pada header di dalam halaman.
        'page-in': 'page-in 0.32s cubic-bezier(0.22, 1, 0.36, 1) backwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
