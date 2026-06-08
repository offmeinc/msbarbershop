import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,jpg,jpeg,svg,ico}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/ui-avatars\.com\/api\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'ui-avatars',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'external-images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        manifest: {
          name: 'MS BARBER SHOP',
          short_name: 'MS Barber',
          description: 'Plataforma completa de agendamento e gestão para MS BARBER SHOP.',
          theme_color: '#171717',
          background_color: '#000000',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            {
              src: 'https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg',
              sizes: '192x192',
              type: 'image/jpeg'
            },
            {
              src: 'https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg',
              sizes: '512x512',
              type: 'image/jpeg'
            },
            {
              src: 'https://i.ibb.co/LXjzGkFs/cd17f19f-71a4-453e-b9d7-f129a7ecfb2f.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
