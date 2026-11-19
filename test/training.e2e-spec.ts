import { z } from 'zod';

import { createFixture } from './support/participants.js';
it('resumes sessions and saves three actual sets without duplication on retry', async () => {
  const f = await createFixture();
  try {
    const { pro, client, id } = await f.relationship('PERSONAL_TRAINING');
    const root = '/contracts/' + id + '/training';
    const data = {
      title: 'Strength',
      workouts: [
        {
          name: 'A',
          exercises: [
            { key: 'squat', name: 'Squat', mode: 'REPS', sets: 3, reps: 10 },
            { key: 'plank', name: 'Plank', mode: 'TIME', sets: 1, seconds: 30 },
          ],
        },
      ],
    };
    const created = await f.api
      .post(root + '/plans')
      .auth(pro.token, { type: 'bearer' })
      .send(data)
      .expect(201);
    const plan = z.object({ id: z.uuid() }).parse(created.body);
    const path = root + '/plans/' + plan.id;
    await f.api
      .put(path + '/publication')
      .auth(pro.token, { type: 'bearer' })
      .expect(200);
    const day = new Date().toISOString().slice(0, 10);
    const start = () =>
      f.api
        .post(path + '/sessions')
        .auth(client.token, { type: 'bearer' })
        .send({ day, workoutIndex: 0 })
        .expect(201);
    const session = z.object({ id: z.uuid() }).parse((await start()).body);
    const url = root + '/sessions/' + session.id;
    for (const i of [0, 1, 1, 2]) {
      await f.api
        .put(url + '/sets')
        .auth(client.token, { type: 'bearer' })
        .send({ exerciseIndex: 0, setIndex: i, reps: 10 - i, loadKg: 20 + i })
        .expect(200);
    }
    await start().expect((r) =>
      expect(r.body).toMatchObject({ id: session.id, sets: [{ reps: 10 }, { reps: 9 }, { reps: 8 }] }),
    );
    await f.api
      .put(url + '/exercises')
      .auth(client.token, { type: 'bearer' })
      .send({ exerciseIndex: 1, skipped: true, note: 'No time' })
      .expect(200);
    await f.api
      .put(url + '/completion')
      .auth(client.token, { type: 'bearer' })
      .expect(200);
    await f.api
      .get(root + '/sessions')
      .query({ from: day, to: day, exerciseKey: 'squat' })
      .auth(pro.token, { type: 'bearer' })
      .expect(200)
      .expect((r) =>
        expect(r.body).toMatchObject([
          {
            sets: [{ loadKg: 20 }, { loadKg: 21 }, { loadKg: 22 }],
            exercises: [{ skipped: true }],
            plan: { id: plan.id },
          },
        ]),
      );
    await f.api
      .put(url + '/sets')
      .auth(client.token, { type: 'bearer' })
      .send({ exerciseIndex: 0, setIndex: 0, reps: 11 })
      .expect(409);
  } finally {
    await f.close();
  }
});
