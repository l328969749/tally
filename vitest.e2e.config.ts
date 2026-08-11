import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  test: {
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    globals: true,
    testTimeout: 180000,
    hookTimeout: 60000
  }
})
