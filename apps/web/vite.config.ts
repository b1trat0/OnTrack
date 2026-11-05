import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// Production stays strict. Development has to allow Vite's inline React Refresh
// preamble and the HMR websocket. Google Fonts are still remote until P2
// self-hosts them, so both policies name them explicitly.
const CSP_DEV = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' ws://localhost:3456 ws://127.0.0.1:3456 http://localhost:3456 http://127.0.0.1:7891 https:",
].join('; ')

const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' http://127.0.0.1:7891 https:",
].join('; ')

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'inject-csp',
      transformIndexHtml(html) {
        const csp = mode === 'development' ? CSP_DEV : CSP_PROD
        return html.replace(
          '</head>',
          `    <meta http-equiv="Content-Security-Policy" content="${csp}">\n  </head>`
        )
      },
    },
  ],
  server: {
    port: 3456,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:7891',
    },
  },
}))
