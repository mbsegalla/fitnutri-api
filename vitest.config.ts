import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    env: { DATABASE_URL: 'postgresql://localhost/fitnutri_unit', PORT: '3000' },
    root: './',
    include: ['**/*.spec.ts'],
  },
});
