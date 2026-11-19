export interface Environment {
  DATABASE_URL: string;
  PORT: number;
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

  return { DATABASE_URL: databaseUrl, PORT: Number(port) };
}
