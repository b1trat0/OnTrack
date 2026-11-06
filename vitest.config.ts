import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}', 'tests/components/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['apps/web/src/**/*.{ts,tsx}', 'apps/backend/src/**/*.ts'],
      exclude: ['**/generated/**', '**/*.d.ts', '**/vite-env.d.ts'],
    },
  },
})
