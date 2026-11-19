import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { z } from 'zod';

import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';

export async function createFixture() {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  await app.init();
  const api = request(app.getHttpServer());
  const db = app.get(PrismaService);
  const accounts: string[] = [];
  async function user() {
    const email = randomUUID() + '@example.org';
    const password = 'Test-only passphrase!';
    const result = await api.post('/auth/register').send({ name: 'Test User', email, password }).expect(201);
    const id = z.object({ id: z.uuid() }).parse(result.body).id;
    accounts.push(id);
    const session = await api.post('/auth/login').send({ email, password }).expect(200);
    const token = z.object({ accessToken: z.string() }).parse(session.body).accessToken;

    return { id, token };
  }
  async function professional(modality: 'NUTRITION' | 'PERSONAL_TRAINING' = 'NUTRITION', priceMinor = 0) {
    const owner = await user();
    const slug = 'pro-' + randomUUID();
    const profile = {
      displayName: slug,
      slug,
      biography: 'Consulting',
      specialties: ['Adults'],
      modalities: [modality],
      formats: ['ONLINE'],
    };
    await api.put('/professionals/me').auth(owner.token, { type: 'bearer' }).send(profile).expect(200);
    const offer = {
      title: 'Monthly',
      description: 'Individual consulting',
      modality,
      priceMinor,
      currency: 'BRL',
      durationDays: 30,
      included: ['Consultation'],
    };
    const result = await api
      .post('/professionals/me/offers')
      .auth(owner.token, { type: 'bearer' })
      .send(offer)
      .expect(201);
    await api.put('/professionals/me/publication').auth(owner.token, { type: 'bearer' }).expect(200);

    return { ...owner, slug, profile, offer, offerId: z.object({ id: z.uuid() }).parse(result.body).id };
  }
  async function close() {
    try {
      await db.account.deleteMany({ where: { id: { in: accounts } } });
    } finally {
      await app.close();
    }
  }
  return { api, user, professional, close };
}
