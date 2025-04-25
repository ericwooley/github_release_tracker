import { defineConfig } from 'vitest/config'

/** @see https://vitejs.dev/config/ */
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    hookTimeout: 30000,
  },
})
