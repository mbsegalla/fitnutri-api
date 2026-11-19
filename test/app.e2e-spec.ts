import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';

describe('Fit Nutri API (e2e)', () => {
  it('starts the HTTP application and returns 404 for an unknown route', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication<INestApplication<App>>();
    try {
      await app.init();
      await request(app.getHttpServer()).get('/unknown-route').expect(404);
    } finally {
      await app.close();
    }
  });
});
