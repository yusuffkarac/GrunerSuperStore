import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tenant name'i environment variable'dan al (build sırasında)
const tenantName = process.env.TENANT_NAME || null;

export default defineConfig({
  appType: 'spa',
  optimizeDeps: {
    include: ['@mui/material', '@mui/icons-material', 'page-flip'],
    exclude: ['jsbarcode']
  },
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
        changeOrigin: true,
        secure: false,
        ws: true, // WebSocket desteği
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/uploads': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('uploads proxy error', err);
          });
        },
      }
    }
  },
  preview: {
    port: 5173,
    strictPort: false
  },
  build: {
    // Tenant-specific build klasörü
    outDir: tenantName ? `dist/${tenantName}` : 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['framer-motion', 'react-icons']
        }
      }
    }
  },
  // Environment variables
  define: {
    // VITE_API_URL build sırasında set edilebilir
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || ''),
  }
});
