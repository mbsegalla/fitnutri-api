import { z } from 'zod';

import { createFixture } from './support/participants.js';
it('keeps execution attached to the original meal plan after publication of a revision', async () => {
  const f = await createFixture();
  try {
    const { id, client, pro } = await f.relationship();
    const third = await f.user();
    const path = '/contracts/' + id + '/nutrition';
    const meal = { title: 'Weekly plan', meals: [{ name: 'Lunch', foods: [{ name: 'Rice', portion: 'One cup' }] }] };
    const create = await f.api
      .post(path + '/plans')
      .auth(pro.token, { type: 'bearer' })
      .send(meal)
      .expect(201);
    const plan = z.object({ id: z.uuid() }).parse(create.body);
    const url = path + '/plans/' + plan.id;
    await f.api.get(url).auth(client.token, { type: 'bearer' }).expect(404);
    await f.api
      .get(path + '/plans')
      .auth(client.token, { type: 'bearer' })
      .expect(200, []);
    await f.api
      .put(url + '/publication')
      .auth(pro.token, { type: 'bearer' })
      .expect(200);
    await f.api
      .get(url)
      .auth(client.token, { type: 'bearer' })
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ id: plan.id }));
    await f.api.get(url).auth(third.token, { type: 'bearer' }).expect(404);
    const day = new Date().toISOString().slice(0, 10);
    await f.api
      .put(url + '/logs')
      .auth(client.token, { type: 'bearer' })
      .send({ day, mealIndex: 0, status: 'ADAPTED' })
      .expect(200);
    const copy = await f.api
      .post(url + '/copies')
      .auth(pro.token, { type: 'bearer' })
      .expect(201);
    const draft = z.object({ id: z.uuid() }).parse(copy.body);
    await f.api
      .put(path + '/plans/' + draft.id)
      .auth(pro.token, { type: 'bearer' })
      .send({ ...meal, title: 'Updated plan' })
      .expect(200);
    await f.api
      .put(path + '/plans/' + draft.id + '/publication')
      .auth(pro.token, { type: 'bearer' })
      .expect(200);
    await f.api
      .get(path + '/day')
      .query({ day })
      .auth(client.token, { type: 'bearer' })
      .expect(200)
      .expect((r) =>
        expect(r.body).toMatchObject({ plan: { id: draft.id }, entries: [{ planId: plan.id, status: 'ADAPTED' }] }),
      );
    await f.api
      .get(path + '/plans')
      .auth(third.token, { type: 'bearer' })
      .expect(404);
    await f.api
      .patch('/contracts/' + id)
      .auth(client.token, { type: 'bearer' })
      .send({ action: 'END' })
      .expect(200);
    await f.api
      .post(url + '/copies')
      .auth(pro.token, { type: 'bearer' })
      .expect(409);
    await f.api
      .get(path + '/plans')
      .auth(client.token, { type: 'bearer' })
      .expect(200);
  } finally {
    await f.close();
  }
});
