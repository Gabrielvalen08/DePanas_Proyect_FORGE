import { defineConfig } from '@playwright/test'

/**
 * Prueba de la versión .zip con Playwright, sobre la carpeta que arma `npm run preparar`
 * (desktop/salida/De Panas SV): `npm run test:escritorio`.
 * Cada corrida usa una carpeta de datos y un puerto temporales: nunca toca la base real del cliente.
 */
export default defineConfig({
  testDir: './pruebas',
  workers: 1,
  timeout: 180_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
})
