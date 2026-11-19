import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

// Opt in to the actual local server. The regular suite uses isolated signing keys.
const video =
  process.env.TEST_LIVEKIT_SERVER === 'true'
    ? parseEnv(readFileSync('.env', 'utf8'))
    : {
        LIVEKIT_URL: 'ws://127.0.0.1:7880',
        LIVEKIT_API_KEY: 'integration-test',
        LIVEKIT_API_SECRET: 'cd'.repeat(32),
      };

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    globalSetup: ['./test/migrateTestDatabase.ts'],
    env: {
      AUTH_JWT_SECRET: 'ab'.repeat(32),
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://fitnutri:fitnutri_test@127.0.0.1:5433/fitnutri_test',
      PORT: '3000',
      STRIPE_TEST_WEBHOOK_SECRET: 'whsec_localtestsabcdefghijklmnop',
      LIVEKIT_URL: video.LIVEKIT_URL,
      LIVEKIT_API_KEY: video.LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET: video.LIVEKIT_API_SECRET,
    },
    root: './',
    include: ['**/*.e2e-spec.ts'],
  },
});
