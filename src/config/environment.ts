export interface Environment {
  DATABASE_URL: string;
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

  return {
    DATABASE_URL: databaseUrl,
    PORT: Number(port),
    SWAGGER_ENABLED: swaggerEnabled === undefined ? values.NODE_ENV !== 'production' : swaggerEnabled === 'true',
  };
}
