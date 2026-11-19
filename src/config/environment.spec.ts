import { validateEnvironment } from './environment.js';

const DATABASE_URL = 'postgresql://localhost/fitnutri_test';

describe('validateEnvironment', () => {
  it('returns a numeric port and supports the default', () => {
    expect(validateEnvironment({ DATABASE_URL })).toEqual({ DATABASE_URL, PORT: 3000 });
    expect(validateEnvironment({ DATABASE_URL, PORT: '4000' }).PORT).toBe(4000);
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
