import { validateEnvironment } from './environment.js';

const DATABASE_URL = 'postgresql://localhost/fitnutri_test';

describe('validateEnvironment', () => {
  it('returns a numeric port and supports the default', () => {
    expect(validateEnvironment({ DATABASE_URL })).toMatchObject({ DATABASE_URL, PORT: 3000 });
    expect(validateEnvironment({ DATABASE_URL, PORT: '4000' }).PORT).toBe(4000);
  });

  it('defaults to Swagger in development and disables it in production', () => {
    expect(validateEnvironment({ DATABASE_URL }).SWAGGER_ENABLED).toBe(true);
    expect(validateEnvironment({ DATABASE_URL, NODE_ENV: 'production' }).SWAGGER_ENABLED).toBe(false);
  });

  it.each(['true', 'false'])('accepts an explicit Swagger override of %s', (value) => {
    const env = validateEnvironment({ DATABASE_URL, NODE_ENV: 'production', SWAGGER_ENABLED: value });

    expect(env.SWAGGER_ENABLED).toBe(value === 'true');
  });

  it('rejects invalid Swagger flags', () => {
    expect(() => validateEnvironment({ DATABASE_URL, SWAGGER_ENABLED: 'yes' })).toThrow(/SWAGGER_ENABLED/);
  });

  it.each(['', 'abc', '0', '65536', '1.5'])('rejects invalid port %j', (PORT) => {
    expect(() => validateEnvironment({ DATABASE_URL, PORT })).toThrow(/PORT/);
  });

  it.each([undefined, '', 'invalid', 'mysql://localhost/db', 'postgres://localhost/'])(
    'rejects invalid database URL %j',
    (url) => {
      expect(() => validateEnvironment({ DATABASE_URL: url })).toThrow(/DATABASE_URL/);
    },
  );
});
