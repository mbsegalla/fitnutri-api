export interface Environment {
  STRIPE_TEST_WEBHOOK_SECRET?: string;
  LIVEKIT_URL?: string;
  LIVEKIT_API_KEY?: string;
  LIVEKIT_API_SECRET?: string;
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

  const webhookSecret = values.STRIPE_TEST_WEBHOOK_SECRET || undefined;
  if (
    webhookSecret !== undefined &&
    (typeof webhookSecret !== 'string' || !/^whsec_[A-Za-z0-9]{16,}$/.test(webhookSecret))
  ) {
    throw new Error('STRIPE_TEST_WEBHOOK_SECRET must be a Stripe endpoint signing secret');
  }
  const videoUrl = values.LIVEKIT_URL || undefined;
  const videoKey = values.LIVEKIT_API_KEY || undefined;
  const videoSecret = values.LIVEKIT_API_SECRET || undefined;

  if (videoUrl || videoKey || videoSecret) {
    const target = typeof videoUrl === 'string' ? URL.parse(videoUrl) : null;
    const local =
      target && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) && values.NODE_ENV !== 'production';

    if (
      !target ||
      !target.hostname ||
      target.username ||
      target.password ||
      target.search ||
      target.hash ||
      !(target.protocol === 'wss:' || (local && target.protocol === 'ws:')) ||
      typeof videoKey !== 'string' ||
      !/^[a-zA-Z0-9_-]{3,128}$/.test(videoKey) ||
      typeof videoSecret !== 'string' ||
      videoSecret.length < 32
    ) {
      throw new Error('LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET require a valid video configuration');
    }
  }

  return {
    STRIPE_TEST_WEBHOOK_SECRET: webhookSecret,
    LIVEKIT_URL: typeof videoUrl === 'string' ? videoUrl : undefined,
    LIVEKIT_API_KEY: typeof videoKey === 'string' ? videoKey : undefined,
    LIVEKIT_API_SECRET: typeof videoSecret === 'string' ? videoSecret : undefined,
    AUTH_JWT_SECRET: secret,
    AUTH_ACCESS_TOKEN_TTL_SECONDS: Number(ttl),
    DATABASE_URL: databaseUrl,
    PORT: Number(port),
    SWAGGER_ENABLED: swaggerEnabled === undefined ? values.NODE_ENV !== 'production' : swaggerEnabled === 'true',
  };
}
