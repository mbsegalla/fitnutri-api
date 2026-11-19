import { validateEnvironment } from './environment.js';

const AUTH_JWT_SECRET = 'ab'.repeat(32);
const DATABASE_URL = 'postgresql://localhost/fitnutri_test';

describe('validateEnvironment', () => {
  it('returns a numeric port and supports the default', () => {
    expect(validateEnvironment({ AUTH_JWT_SECRET, DATABASE_URL })).toMatchObject({ DATABASE_URL, PORT: 3000 });
    expect(validateEnvironment({ AUTH_JWT_SECRET, DATABASE_URL, PORT: '4000' }).PORT).toBe(4000);
  });

  it.each([undefined, '', 'too-short', 'g'.repeat(64)])('rejects an invalid signing secret', (secret) => {
    expect(() => validateEnvironment({ DATABASE_URL, AUTH_JWT_SECRET: secret })).toThrow(/AUTH_JWT_SECRET/);
  });

  it.each(['', '0', '900s', '-5', '86401'])('rejects invalid token TTL %j', (ttl) => {
    expect(() => validateEnvironment({ DATABASE_URL, AUTH_JWT_SECRET, AUTH_ACCESS_TOKEN_TTL_SECONDS: ttl })).toThrow(
      /AUTH_ACCESS_TOKEN_TTL_SECONDS/,
    );
  });

  it('defaults to Swagger in development and disables it in production', () => {
    expect(validateEnvironment({ AUTH_JWT_SECRET, DATABASE_URL }).SWAGGER_ENABLED).toBe(true);
    expect(validateEnvironment({ AUTH_JWT_SECRET, DATABASE_URL, NODE_ENV: 'production' }).SWAGGER_ENABLED).toBe(false);
  });

  it.each(['true', 'false'])('accepts an explicit Swagger override of %s', (value) => {
    const env = validateEnvironment({ AUTH_JWT_SECRET, DATABASE_URL, NODE_ENV: 'production', SWAGGER_ENABLED: value });

    expect(env.SWAGGER_ENABLED).toBe(value === 'true');
  });

  it('rejects invalid Swagger flags', () => {
    expect(() => validateEnvironment({ AUTH_JWT_SECRET, DATABASE_URL, SWAGGER_ENABLED: 'yes' })).toThrow(
      /SWAGGER_ENABLED/,
    );
  });

  it.each(['', 'abc', '0', '65536', '1.5'])('rejects invalid port %j', (PORT) => {
    expect(() => validateEnvironment({ AUTH_JWT_SECRET, DATABASE_URL, PORT })).toThrow(/PORT/);
  });

  it.each([undefined, '', 'invalid', 'mysql://localhost/db', 'postgres://localhost/'])(
    'rejects invalid database URL %j',
    (url) => {
      expect(() => validateEnvironment({ AUTH_JWT_SECRET, DATABASE_URL: url })).toThrow(/DATABASE_URL/);
    },
  );
  it('validates complete video credentials and requires TLS outside local development', () => {
    const base = {
      AUTH_JWT_SECRET,
      DATABASE_URL,
      LIVEKIT_URL: 'ws://127.0.0.1:7880',
      LIVEKIT_API_KEY: 'local',
      LIVEKIT_API_SECRET: 'a'.repeat(32),
    };
    expect(validateEnvironment(base).LIVEKIT_URL).toBe(base.LIVEKIT_URL);
    expect(() => validateEnvironment({ ...base, LIVEKIT_API_SECRET: '' })).toThrow(/LIVEKIT/);
    expect(() => validateEnvironment({ ...base, NODE_ENV: 'production' })).toThrow(/LIVEKIT/);
  });
});
