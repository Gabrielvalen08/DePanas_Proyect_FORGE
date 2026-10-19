import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // DEPANAS_API: otro backend (las pruebas e2e levantan uno aparte, ver playwright.config.js)
        target: process.env.DEPANAS_API || 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    css: { modules: { classNameStrategy: 'non-scoped' } },
    // Las pruebas de e2e/ son de Playwright (npm run test:e2e), no de Vitest
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
})
