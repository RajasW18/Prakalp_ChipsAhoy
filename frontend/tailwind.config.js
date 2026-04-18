/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          cyan:    '#22d3ee',
          purple:  '#8b5cf6',
          green:   '#10b981',
          amber:   '#f59e0b',
          red:     '#ef4444',
        },
        surface: {
          base  : '#030712',
          card  : 'rgba(255,255,255,0.04)',
          cardHover: 'rgba(255,255,255,0.07)',
          border: 'rgba(255,255,255,0.08)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'glow-pulse'    : 'glowPulse 2s ease-in-out infinite',
        'float'         : 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradientShift 8s ease infinite',
        'slide-up'      : 'slideUp 0.4s ease-out',
        'fade-in'       : 'fadeIn 0.3s ease-out',
        'scan-line'     : 'scanLine 3s linear infinite',
        'ping-slow'     : 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(34,211,238,0.3)'  },
          '50%'     : { boxShadow: '0 0 20px 6px rgba(34,211,238,0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)'   },
          '50%'     : { transform: 'translateY(-12px)' },
        },
        gradientShift: {
          '0%'  : { backgroundPosition: '0% 50%'   },
          '50%' : { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%'   },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to  : { opacity: '1', transform: 'translateY(0)'    },
        },
        fadeIn: {
          from: { opacity: '0' },
          to  : { opacity: '1' },
        },
        scanLine: {
          '0%'  : { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)'  },
        },
      },
      backdropBlur: { xs: '2px' },
      backgroundImage: {
        'radial-glow': 'radial-gradient(ellipse at center, rgba(34,211,238,0.1) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
};
