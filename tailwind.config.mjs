/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          deep: '#659287',
          medium: '#88BDA4',
          soft: '#B1D3B9',
          light: '#E6F2DD',
          50: '#f7fbf5',
          100: '#E6F2DD',
          200: '#B1D3B9',
          300: '#88BDA4',
          400: '#659287',
          500: '#507c72',
          600: '#3d645b',
          700: '#2b4943',
          DEFAULT: '#659287',
        },
        chalkboard: {
          dark: '#1e1e1e',
          green: '#275c46',
        },
        coffee: {
          yellow: '#FFDD00',
          hover: '#f5d500'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
