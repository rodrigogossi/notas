import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    // escuta em todas as interfaces (0.0.0.0), não só localhost — permite abrir o app a partir
    // de outro dispositivo na mesma rede local durante o desenvolvimento (ex: celular/tablet).
    host: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      workbox: {
        // /api/* nunca deve ser cacheado pelo Workbox — o offline-first de dados é
        // responsabilidade da fila pendingOps + IndexedDB, não do cache HTTP.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'Notas',
        short_name: 'Notas',
        description: 'Notas de texto (Markdown) e manuscritas, offline-first, sync via WebDAV',
        theme_color: '#1e6fd9',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
