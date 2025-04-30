/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'var(--font-geist-sans)',
          'Inter var',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'var(--font-geist-mono)',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      animation: {
        'ping-once': 'ping-subtle 0.6s cubic-bezier(0.18, 0.89, 0.32, 1.28) 1',
        'shimmer-right': 'shimmer-right 3s linear infinite',
        'slideFromRight': 'slideFromRight 0.35s cubic-bezier(0.34, 0.69, 0.1, 1) forwards',
        'slideFromLeft': 'slideFromLeft 0.35s cubic-bezier(0.34, 0.69, 0.1, 1) forwards',
        'fadeIn': 'fadeIn 0.25s ease-in forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slideUp': 'slideUp 0.35s cubic-bezier(0.34, 0.69, 0.1, 1) forwards',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
      },
      keyframes: {
        'shimmer-right': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        'ping-subtle': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { transform: 'scale(1.8)', opacity: '0' }
        },
        'slideFromRight': {
          '0%': { transform: 'translateX(18px)', opacity: '0.3' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        'slideFromLeft': {
          '0%': { transform: 'translateX(-18px)', opacity: '0.3' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        'fadeIn': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slideUp': {
          '0%': { transform: 'translateY(10px)', opacity: '0.3' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'shake': {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-3px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(3px, 0, 0)' },
        },
      },
    },
  },
  plugins: [
    // Import daisyui using dynamic import to maintain ESM compatibility
    // This syntax is supported by tailwindcss for plugins
    await import('daisyui'),
  ],
  daisyui: {
    themes: ["light", "dark"],
    darkTheme: "dark",
  },
}; 