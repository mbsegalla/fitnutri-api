export interface Environment {
  DATABASE_URL: string;
  AUTH_JWT_SECRET: string;
  AUTH_ACCESS_TOKEN_TTL_SECONDS: number;
  PORT: number;
  SWAGGER_ENABLED: boolean;
}

export function validateEnvironment(values: Record<string, unknown>): Environment {
  const databaseUrl = values.DATABASE_URL;
  const parsed = typeof databaseUrl === 'string' ? URL.parse(databaseUrl) : null;

  if (
    typeof databaseUrl !== 'string' ||
    !parsed?.hostname ||
    !['postgresql:', 'postgres:'].includes(parsed.protocol) ||
    parsed.pathname.length <= 1
  ) {
    throw new Error('DATABASE_URL must be a PostgreSQL URL with a host and database name');
  }

  const port = values.PORT ?? '3000';

  if (typeof port !== 'string' || !/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const swaggerEnabled = values.SWAGGER_ENABLED;

  if (swaggerEnabled !== undefined && swaggerEnabled !== 'true' && swaggerEnabled !== 'false') {
    throw new Error('SWAGGER_ENABLED must be true or false');
  }

  const secret = values.AUTH_JWT_SECRET;

  if (typeof secret !== 'string' || !/^[a-f0-9]{64}$/i.test(secret)) {
    throw new Error('AUTH_JWT_SECRET must contain 64 hexadecimal characters');
  }

  const ttl = values.AUTH_ACCESS_TOKEN_TTL_SECONDS ?? '900';

  if (typeof ttl !== 'string' || !/^\d+$/.test(ttl) || Number(ttl) < 1 || Number(ttl) > 86400) {
    throw new Error('AUTH_ACCESS_TOKEN_TTL_SECONDS must be an integer between 1 and 86400');
  }

  return {
    AUTH_JWT_SECRET: secret,
    AUTH_ACCESS_TOKEN_TTL_SECONDS: Number(ttl),
    DATABASE_URL: databaseUrl,
    PORT: Number(port),
    SWAGGER_ENABLED: swaggerEnabled === undefined ? values.NODE_ENV !== 'production' : swaggerEnabled === 'true',
  };
}
