import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  appType: 'spa',
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      // Development modunda Service Worker'ı devre dışı bırak
      devOptions: {
        enabled: false,
        type: 'module'
      },
      includeAssets: ['favicon.ico'],
      manifest: {
        name: 'Gruner SuperStore',
        short_name: 'Gruner',
        description: 'Online Market Sipariş Uygulaması',
        theme_color: '#047857',
        background_color: '#ffffff',
        display: 'standalone',
        icons: []
      },
      workbox: {
        // Cache stratejileri
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 saat
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 gün
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    hmr: {
      clientPort: 5173
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 5173,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'react-icons']
        }
      }
    }
  }
});
