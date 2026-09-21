import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    vuetify({ autoImport: true }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Target: Chrome 110+, Edge 110+, Firefox 110+, Safari 16+
    target: ['chrome110', 'edge110', 'firefox110', 'safari16'],
    cssTarget: ['chrome110', 'edge110', 'firefox110', 'safari16'],
  },
  css: {
    postcss: {
      plugins: [
        // Autoprefixer adds -webkit-, -moz- prefixes automatically
        // Ensures CSS works on Safari, Firefox, older mobile browsers
        (await import('autoprefixer')).default(),
      ],
    },
  },
})
