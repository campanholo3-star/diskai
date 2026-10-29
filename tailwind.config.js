/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        diskai: {
          bg: '#131519',
          surface: '#1A1D23',
          elevated: '#22262E',
          hover: '#292E38',
          border: '#2C313C',
          borderSubtle: '#22262E',
          accent: '#16B99A',
          accentHover: '#139e83',
          accentLight: 'rgba(22, 185, 154, 0.12)',
          cyan: '#0EA5E9',
          textPrimary: '#F8FAFC',
          textSecondary: '#94A3B8',
          textMuted: '#64748B',
          danger: '#EF4444',
          warning: '#F59E0B',
          success: '#10B981',
        },
        discord: {
          sidebar: '#1A1D23',
          channelList: '#20242A',
          chat: '#17191D',
          chatInput: '#22262E',
          hover: '#292E38',
          active: '#313743',
          blurple: '#16B99A',
          blurpleHover: '#139e83',
          green: '#10B981',
          yellow: '#F59E0B',
          red: '#EF4444',
          textNormal: '#F8FAFC',
          textMuted: '#94A3B8',
          textHeader: '#FFFFFF'
        }
      },
      fontFamily: {
        sans: ['"gg sans"', '"Noto Sans"', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
        'spin-slow': 'spin 4s linear infinite',
      }
    },
  },
  plugins: [],
}
