import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { createFixture } from './support/participants.js';
it('paginates private messages and notifies a recipient once per message', async () => {
  const f = await createFixture();
  try {
    const { pro, client, id } = await f.relationship();
    const other = await f.user();
    const path = '/contracts/' + id + '/messages';
    const send = (requestKey: string, body: string) =>
      f.api.post(path).auth(client.token, { type: 'bearer' }).send({ requestKey, body });
    const key = randomUUID();
    const first = z.object({ id: z.uuid() }).parse((await send(key, 'First').expect(201)).body);
    await send(key, 'First')
      .expect(201)
      .expect((r) => expect(r.body).toMatchObject({ id: first.id }));
    await send(key, 'Changed').expect(409);
    await send(randomUUID(), 'Second').expect(201);
    const one = await f.api.get(path).auth(pro.token, { type: 'bearer' }).query({ limit: 1 }).expect(200);
    const page = z
      .object({
        next: z.uuid(),
        unread: z.literal(2),
        items: z.array(z.object({ body: z.literal('Second') })).length(1),
      })
      .parse(one.body);
    await f.api
      .get(path)
      .auth(pro.token, { type: 'bearer' })
      .query({ before: page.next })
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ items: [{ id: first.id }], next: null }));
    await f.api
      .put(path + '/' + first.id + '/read')
      .auth(pro.token, { type: 'bearer' })
      .expect(200);
    await f.api
      .get(path)
      .auth(pro.token, { type: 'bearer' })
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ unread: 1 }));
    await f.api.get(path).auth(other.token, { type: 'bearer' }).expect(404);
    const notifications = z
      .object({
        unread: z.literal(2),
        items: z.array(z.object({ id: z.uuid(), kind: z.literal('MESSAGE') })).length(2),
      })
      .parse((await f.api.get('/notifications').auth(pro.token, { type: 'bearer' }).expect(200)).body);
    const ack = '/notifications/' + notifications.items[0].id + '/read';
    await f.api.put(ack).auth(client.token, { type: 'bearer' }).expect(404);
    await f.api.put(ack).auth(pro.token, { type: 'bearer' }).expect(200);
  } finally {
    await f.close();
  }
});
