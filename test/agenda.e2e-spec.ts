import { randomUUID } from 'node:crypto';

import { TokenVerifier } from 'livekit-server-sdk';
import { z } from 'zod';

import { createFixture } from './support/participants.js';

it('serializes competing bookings and grants private online room access to the two participants', async () => {
  const f = await createFixture();
  try {
    const { client, pro, id } = await f.relationship();
    const second = await f.user();
    const contract = z
      .object({ id: z.uuid() })
      .parse(
        (
          await f.api
            .post('/contracts')
            .auth(second.token, { type: 'bearer' })
            .send({ offerId: pro.offerId, requestKey: randomUUID() })
            .expect(201)
        ).body,
      );
    await f.api
      .patch('/contracts/' + contract.id)
      .auth(pro.token, { type: 'bearer' })
      .send({ action: 'ACCEPT' })
      .expect(200);
    const slot = async (minutes: number) => {
      const startsAt = new Date(Date.now() + minutes * 60000);
      const endsAt = new Date(+startsAt + 5 * 60000);
      return z.object({ id: z.uuid() }).parse(
        (
          await f.api
            .post('/professionals/me/availability')
            .auth(pro.token, { type: 'bearer' })
            .send({
              startsAt: startsAt.toISOString(),
              endsAt: endsAt.toISOString(),
              timeZone: 'America/Sao_Paulo',
              format: 'ONLINE',
            })
            .expect(201)
        ).body,
      ).id;
    };
    const first = await slot(2);
    const later = await slot(10);
    const keys = [randomUUID(), randomUUID()];
    const clients = [client, second];
    const paths = [id, contract.id].map((v) => '/contracts/' + v + '/appointments');
    const attempt = (index: number) =>
      f.api
        .post(paths[index])
        .auth(clients[index].token, { type: 'bearer' })
        .send({ requestKey: keys[index], slotId: first });
    const attempts = await Promise.all([attempt(0), attempt(1)]);
    expect(attempts.map((r) => r.status).sort()).toEqual([201, 409]);
    const i = attempts.findIndex((r) => r.status === 201);
    const appt = z.object({ id: z.uuid() }).parse(attempts[i].body);
    const path = paths[i] + '/' + appt.id;
    await attempt(i)
      .expect(201)
      .expect((r) => expect(r.body).toMatchObject({ id: appt.id }));
    await f.api
      .get(paths[i])
      .auth(pro.token, { type: 'bearer' })
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject([{ slot: { id: first, timeZone: 'America/Sao_Paulo' } }]));
    await f.api
      .post(path + '/room')
      .auth(clients[1 - i].token, { type: 'bearer' })
      .expect(404);
    const verifier = new TokenVerifier(
      z.string().parse(process.env.LIVEKIT_API_KEY),
      z.string().parse(process.env.LIVEKIT_API_SECRET),
    );
    for (const participant of [clients[i], pro]) {
      const { token, url } = z.object({ token: z.string(), url: z.url() }).parse(
        (
          await f.api
            .post(path + '/room')
            .auth(participant.token, { type: 'bearer' })
            .expect(201)
        ).body,
      );
      const claims = await verifier.verify(token);
      expect(claims).toMatchObject({
        sub: participant.id,
        video: { room: 'consultation-' + appt.id + '-1', roomJoin: true },
      });
      if (process.env.TEST_LIVEKIT_SERVER === 'true') {
        const response = await fetch(url.replace(/^ws/, 'http') + '/rtc/validate', {
          headers: { Authorization: 'Bearer ' + token },
        });
        expect(response.status).toBe(200);
      }
      const notifications = await f.api.get('/notifications').auth(participant.token, { type: 'bearer' }).expect(200);
      expect(notifications.body).toMatchObject({ items: [{ kind: 'APPOINTMENT_BOOKED' }] });
    }
    const move = () =>
      f.api
        .put(path + '/schedule')
        .auth(clients[i].token, { type: 'bearer' })
        .send({ expectedRevision: 1, slotId: later });
    await move().expect(200);
    await move().expect(200);
    await f.api
      .put(path + '/cancellation')
      .auth(pro.token, { type: 'bearer' })
      .expect(200);
    await f.api
      .put(path + '/cancellation')
      .auth(pro.token, { type: 'bearer' })
      .expect(200);
    await f.api
      .post(path + '/room')
      .auth(clients[i].token, { type: 'bearer' })
      .expect(409);
    await f.api
      .get('/notifications')
      .auth(pro.token, { type: 'bearer' })
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ unread: 3 }));
  } finally {
    await f.close();
  }
});
