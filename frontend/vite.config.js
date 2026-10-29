import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        // DEPANAS_API: otro backend (las pruebas e2e levantan uno aparte, ver playwright.config.js)
        // 127.0.0.1 y no localhost: el backend escucha solo en IPv4 local (index.js) y localhost puede ser ::1
        target: process.env.DEPANAS_API || 'http://127.0.0.1:3000',
        changeOrigin: true,
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // Con todas las suites en paralelo (jsdom, user-event, PBKDF2 del modo local) una prueba
    // que sola tarda ~0,6 s puede pasar de los 5 s por defecto: no es un error de la prueba
    testTimeout: 15_000,
    css: { modules: { classNameStrategy: 'non-scoped' } },
    // Las pruebas de e2e/ son de Playwright (npm run test:e2e), no de Vitest
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
})
