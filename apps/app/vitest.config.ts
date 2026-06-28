import { defineConfig } from 'vitest/config'

// The scheduling engine is pure TypeScript — no DOM, no Vite plugins needed.
// Keep this config minimal and separate from vite.config.ts so tests run fast.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
