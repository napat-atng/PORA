import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt', includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
    manifest: { name: 'เหลือใช้เท่าไร', short_name: 'เหลือใช้', description: 'ดูเงินเหลือใช้จนถึงเงินเข้าครั้งหน้า', lang: 'th', start_url: '/', scope: '/', display: 'standalone', background_color: '#f7f8fa', theme_color: '#145b50', icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ] },
    workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], navigateFallback: 'index.html', cleanupOutdatedCaches: true }
  })]
});
