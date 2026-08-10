/** CDAM Certify design tokens — institutional trust (teal/emerald) + warm clay accent */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#14231F',
        paper: '#FBFAF7',
        emerald: {
          50: '#E1F5EE', 100: '#9FE1CB', 200: '#5DCAA5', 400: '#1D9E75',
          600: '#0F6E56', 800: '#085041', 900: '#04342C',
        },
        clay: {
          50: '#FAEEDA', 100: '#FAC775', 200: '#EF9F27', 400: '#BA7517',
          600: '#854F0B', 800: '#633806', 900: '#412402',
        },
        sand: {
          50: '#FBFAF7', 100: '#F1EFE8', 200: '#D3D1C7', 400: '#888780',
          600: '#5F5E5A', 800: '#2C2C2A',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,35,31,0.06), 0 8px 24px -12px rgba(20,35,31,0.12)',
      },
      keyframes: {
        'toast-in': { '0%': { transform: 'translateY(-12px) scale(0.96)', opacity: '0' }, '100%': { transform: 'translateY(0) scale(1)', opacity: '1' } },
        'fade-up': { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'seal-pop': { '0%': { transform: 'scale(0.6) rotate(-8deg)', opacity: '0' }, '60%': { transform: 'scale(1.08) rotate(2deg)', opacity: '1' }, '100%': { transform: 'scale(1) rotate(0)', opacity: '1' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
      },
      animation: {
        'toast-in': 'toast-in 0.28s cubic-bezier(0.16,1,0.3,1)',
        'fade-up': 'fade-up 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'seal-pop': 'seal-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) both',
        shimmer: 'shimmer 1.6s infinite linear',
      },
    },
  },
  plugins: [],
};
