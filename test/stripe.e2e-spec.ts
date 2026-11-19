import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Stripe from 'stripe';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

it('records verified sandbox events once across retries, including out-of-order arrivals', async () => {
  const ref = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = ref.createNestApplication<INestApplication<App>>({ rawBody: true });
  const db = app.get(PrismaService);
  const objectId = 'sub_' + randomUUID();
  try {
    await app.init();
    const api = request(app.getHttpServer());
    const deliver = (body: string, signature: string) =>
      api
        .post('/billing/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', signature)
        .send(body);
    const sign = (payload: string) =>
      Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_localtestsabcdefghijklmnop' });
    const event = {
      id: 'evt_' + randomUUID(),
      object: 'event',
      type: 'customer.subscription.deleted',
      created: 200,
      livemode: false,
      data: { object: { id: objectId } },
    };
    const latest = JSON.stringify(event);
    await Promise.all([deliver(latest, sign(latest)).expect(200), deliver(latest, sign(latest)).expect(200)]);
    const earlier = JSON.stringify({
      ...event,
      id: 'evt_' + randomUUID(),
      created: 100,
      type: 'invoice.payment_failed',
    });
    await deliver(earlier, sign(earlier)).expect(200);
    await deliver(earlier, sign(latest)).expect(400);
    const live = JSON.stringify({ ...event, livemode: true });
    await deliver(live, sign(live)).expect(400);
    const events = await db.stripeEvent.findMany({ where: { objectId }, orderBy: { occurredAt: 'asc' } });
    expect(events.map((v) => v.type)).toEqual(['invoice.payment_failed', 'customer.subscription.deleted']);
  } finally {
    await db.stripeEvent.deleteMany({ where: { objectId } });
    await app.close();
  }
});
