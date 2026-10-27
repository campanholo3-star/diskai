/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          sidebar: '#1e1f22',
          channelList: '#2b2d31',
          chat: '#313338',
          chatInput: '#383a40',
          hover: '#35373c',
          active: '#404249',
          blurple: '#5865F2',
          blurpleHover: '#4752c4',
          green: '#23a55a',
          yellow: '#f0b232',
          red: '#f23f43',
          textNormal: '#dbdee1',
          textMuted: '#949ba4',
          textHeader: '#f2f3f5'
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
