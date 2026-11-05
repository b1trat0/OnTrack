import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Production stays strict. Development has to allow Vite's inline React Refresh
// preamble and the HMR websocket. Google Fonts are still remote until P2
// self-hosts them, so both policies name them explicitly.
const CSP_DEV = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self' ws://localhost:3456 ws://127.0.0.1:3456 http://localhost:3456 http://127.0.0.1:7891 https:",
].join('; ')

const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self' http://127.0.0.1:7891 https:",
].join('; ')

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: { enabled: false },
      includeAssets: ['theme-init.js', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'OnTrack',
        short_name: 'OnTrack',
        description: 'ADHD-friendly notes, calendar, diary, timer, and agents.',
        theme_color: '#C2410C',
        background_color: '#FFF7ED',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,woff2,svg,png,ico}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          markdown: ['react-markdown'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          motion: ['motion'],
        },
      },
    },
  },
}))
