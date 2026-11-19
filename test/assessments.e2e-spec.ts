import { z } from 'zod';

import { createFixture } from './support/participants.js';
it('scopes intake, documents and published feedback to the specific contract', async () => {
  const f = await createFixture();
  try {
    const { pro, client, id } = await f.relationship();
    const other = await f.professional('PERSONAL_TRAINING');
    const root = '/contracts/' + id;
    await f.api
      .put(root + '/intake')
      .auth(client.token, { type: 'bearer' })
      .send({ goal: 'Strength', routine: 'Office' })
      .expect(200);
    await f.api
      .put(root + '/intake/review')
      .auth(pro.token, { type: 'bearer' })
      .expect(200);
    const upload = await f.api
      .post(root + '/documents')
      .auth(client.token, { type: 'bearer' })
      .field('kind', 'EXAM')
      .attach('file', Buffer.from('%PDF-1.7\n% fixture'), 'results.pdf')
      .expect(201);
    const doc = z.object({ id: z.uuid() }).parse(upload.body);
    const url = root + '/documents/' + doc.id;
    await f.api
      .get(url + '/file')
      .auth(other.token, { type: 'bearer' })
      .expect(404);
    await f.api
      .get(url + '/file')
      .auth(pro.token, { type: 'bearer' })
      .expect(200)
      .expect('Content-Type', /pdf/);
    await f.api
      .put(url + '/analysis')
      .auth(pro.token, { type: 'bearer' })
      .send({ text: 'Sensitive draft', publish: false })
      .expect(200);
    await f.api
      .get(root + '/documents')
      .auth(client.token, { type: 'bearer' })
      .expect(200)
      .expect((r) => expect(r.text).not.toContain('Sensitive draft'));
    await f.api
      .put(url + '/analysis')
      .auth(pro.token, { type: 'bearer' })
      .send({ text: 'Review complete', publish: true })
      .expect(200);
    await f.api
      .get(root + '/documents')
      .auth(client.token, { type: 'bearer' })
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject([{ publishedAnalysis: 'Review complete' }]));
    await f.api
      .post(root + '/documents')
      .auth(client.token, { type: 'bearer' })
      .field('kind', 'EXAM')
      .attach('file', Buffer.from('html'), 'fake.pdf')
      .expect(400);
  } finally {
    await f.close();
  }
});
