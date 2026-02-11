import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'security/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    css: false, // Disable CSS processing for backend API tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/scripts/**', 'node_modules/**'],
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000, // Increased to 30s for DoS tests
    hookTimeout: 30000,
  },
});
