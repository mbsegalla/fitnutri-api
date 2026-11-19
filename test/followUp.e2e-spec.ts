import { z } from 'zod';

import { createFixture } from './support/participants.js';

it('turns a weekly check-in into an actionable item and publishes the reply to the client', async () => {
  const f = await createFixture();
  try {
    const { pro, client, id } = await f.relationship();
    const stranger = await f.user();
    const dashboard = '/professionals/me/dashboard';
    const root = '/contracts/' + id;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    now.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
    const weekStart = now.toISOString().slice(0, 10);
    const period = { from: weekStart, to: today };
    await f.api.get(dashboard).auth(stranger.token, { type: 'bearer' }).expect(200, []);
    await f.api
      .get(root + '/evolution')
      .query(period)
      .auth(client.token, { type: 'bearer' })
      .expect(200, { meals: [], sessions: [], assessments: [], checkIns: [] });
    const submit = () =>
      f.api
        .put(root + '/check-ins')
        .auth(client.token, { type: 'bearer' })
        .send({ weekStart, adherence: 3, difficulty: 'Travel' });
    const check = z.object({ id: z.uuid() }).parse((await submit().expect(200)).body);
    await submit()
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ id: check.id }));
    await f.api
      .get(dashboard)
      .auth(pro.token, { type: 'bearer' })
      .expect(200)
      .expect((r) =>
        expect(r.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              kind: 'CHECK_IN_PENDING',
              resourceId: check.id,
              href: root + '/check-ins/' + check.id,
            }),
            expect.objectContaining({ kind: 'PLAN_MISSING' }),
          ]),
        ),
      );
    await f.api
      .get(root + '/check-ins/' + check.id)
      .auth(pro.token, { type: 'bearer' })
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ id: check.id, difficulty: 'Travel' }));
    await f.api
      .get(root + '/check-ins/' + check.id)
      .auth(stranger.token, { type: 'bearer' })
      .expect(404);
    const url = root + '/check-ins/' + check.id + '/reply';
    await f.api.put(url).auth(stranger.token, { type: 'bearer' }).send({ reply: 'Try again' }).expect(404);
    await f.api.put(url).auth(pro.token, { type: 'bearer' }).send({ reply: 'Reviewed' }).expect(200);
    await submit().expect(409);
    await f.api
      .get(dashboard)
      .auth(pro.token, { type: 'bearer' })
      .expect(200)
      .expect((r) =>
        expect(r.body).not.toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'CHECK_IN_PENDING' })])),
      );
    await f.api
      .get(root + '/timeline')
      .query(period)
      .auth(client.token, { type: 'bearer' })
      .expect(200)
      .expect((r) =>
        expect(r.body).toEqual(
          expect.arrayContaining([expect.objectContaining({ kind: 'REPLY', resourceId: check.id })]),
        ),
      );
    await f.api
      .get(root + '/evolution')
      .query(period)
      .auth(client.token, { type: 'bearer' })
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ meals: [], checkIns: [{ reply: 'Reviewed' }] }));
  } finally {
    await f.close();
  }
});
