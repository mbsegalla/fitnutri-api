import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';

describe('Fit Nutri API (e2e)', () => {
  async function startApp(databaseUrl?: string) {
    const builder = Test.createTestingModule({ imports: [AppModule] });

    if (databaseUrl) {
      builder.overrideProvider(ConfigService).useValue(new ConfigService({ DATABASE_URL: databaseUrl }));
    }

    const moduleRef = await builder.compile();
    const app = moduleRef.createNestApplication<INestApplication<App>>();

    await app.init();

    return app;
  }

  it('reports readiness against the test database', async () => {
    const app = await startApp();

    try {
      const api = request(app.getHttpServer());

      await api.get('/health/live').expect(200, { status: 'ok' });
      await api.get('/health/ready').expect(200, { status: 'ready' });
      await api.get('/unknown-route').expect(404);
    } finally {
      await app.close();
    }
  });

  it('returns a generic 503 and stays live when the database is unreachable', async () => {
    const app = await startApp('postgresql://private_user:private_password@127.0.0.1:1/unavailable');

    try {
      const api = request(app.getHttpServer());
      const response = await api.get('/health/ready').expect(503);

      expect(response.body).toMatchObject({ statusCode: 503, message: 'Database unavailable' });
      expect(response.text).not.toContain('private_');

      await api.get('/health/live').expect(200, { status: 'ok' });
    } finally {
      await app.close();
    }
  });
});
