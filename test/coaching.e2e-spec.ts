import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { createFixture } from './support/participants.js';

it('deduplicates simultaneous requests, snapshots prices and authorizes transitions', async () => {
  const f = await createFixture();
  try {
    const pro = await f.professional('NUTRITION', 18000);
    const client = await f.user();
    const third = await f.user();
    const body = { offerId: pro.offerId, requestKey: randomUUID() };
    const send = () => f.api.post('/contracts').auth(client.token, { type: 'bearer' }).send(body).expect(201);
    const [a, b] = await Promise.all([send(), send()]);
    const { id } = z.object({ id: z.uuid() }).parse(a.body);
    expect(b.body).toMatchObject({ id });
    const url = '/contracts/' + id;
    await f.api
      .put('/professionals/me/offers/' + pro.offerId)
      .auth(pro.token, { type: 'bearer' })
      .send({ ...pro.offer, priceMinor: 12000 })
      .expect(200);
    await f.api.get(url).auth(third.token, { type: 'bearer' }).expect(404);
    await f.api.patch(url).auth(client.token, { type: 'bearer' }).send({ action: 'ACCEPT' }).expect(404);
    await f.api
      .patch(url)
      .auth(pro.token, { type: 'bearer' })
      .send({ action: 'ACCEPT' })
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ active: false, payment: 'UNPAID', terms: { priceMinor: 18000 } }));
    await f.api.patch(url).auth(client.token, { type: 'bearer' }).send({ action: 'END' }).expect(200);
    const free = await f.relationship('PERSONAL_TRAINING');
    await f.api
      .get('/contracts/' + free.id)
      .auth(free.client.token, { type: 'bearer' })
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ active: true, payment: 'FREE' }));
  } finally {
    await f.close();
  }
});
