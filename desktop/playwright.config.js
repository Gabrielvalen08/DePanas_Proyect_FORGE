import { defineConfig } from '@playwright/test'

/**
 * Prueba de la app de escritorio (Electron) con Playwright.
 *   npm run test:escritorio                 la app sin empaquetar (después de `npm run preparar`)
 *   DEPANAS_EXE="…\De Panas SV.exe" npm run test:escritorio   la app ya instalada o empaquetada
 * Cada corrida usa una carpeta de datos temporal: nunca toca la base real del cliente.
 */
export default defineConfig({
  testDir: './pruebas',
  workers: 1,
  timeout: 180_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
})
