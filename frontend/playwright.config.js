import { defineConfig, devices } from '@playwright/test'

/**
 * Pruebas end-to-end (e2e/): un navegador real recorre la app completa, con el
 * backend y una base de datos temporal (e2e/.tmp/, se borra en cada corrida).
 * Nunca tocan backend/db/depanas.db.
 *
 * Levantan sus propios servidores en otros puertos (backend 3100, frontend 5174),
 * así que se pueden correr con `npm run dev` abierto.
 *
 *   npm run test:e2e              todas, sin ventana
 *   npm run test:e2e -- --headed  viendo el navegador
 *   npm run test:e2e:ui           modo interactivo de Playwright
 *   npx playwright show-report    reporte de la última corrida (con capturas y video de lo que falló)
 */

const PUERTO_BACKEND = 3100
const PUERTO_FRONTEND = 5174

export default defineConfig({
  testDir: './e2e',
  // Todas comparten la misma base: una a la vez, en orden
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PUERTO_FRONTEND}`,
    locale: 'es-SV',
    timezoneId: 'America/El_Salvador',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] }, testIgnore: /movil\.spec/ },
    { name: 'movil', use: { ...devices['Pixel 7'] }, testMatch: /movil\.spec/ },
  ],
  webServer: [
    {
      command: 'node e2e/servidor-pruebas.js',
      url: `http://127.0.0.1:${PUERTO_BACKEND}/api/health`,
      env: { PORT: String(PUERTO_BACKEND) },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `npx vite --port ${PUERTO_FRONTEND} --strictPort`,
      url: `http://localhost:${PUERTO_FRONTEND}`,
      env: { DEPANAS_API: `http://127.0.0.1:${PUERTO_BACKEND}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
