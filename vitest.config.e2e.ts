import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    globalSetup: ['./test/migrateTestDatabase.ts'],
    env: {
      AUTH_JWT_SECRET: 'ab'.repeat(32),
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://fitnutri:fitnutri_test@127.0.0.1:5433/fitnutri_test',
      PORT: '3000',
    },
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
