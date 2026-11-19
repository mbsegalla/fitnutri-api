import { createFixture } from './support/participants.js';
it('publishes searchable offers, keeps drafts private and removes hidden profiles from discovery', async () => {
  const f = await createFixture();
  try {
    const pro = await f.professional();
    const other = await f.professional();
    await f.api
      .get('/professionals')
      .query({ q: pro.slug, format: 'ONLINE', modality: 'NUTRITION' })
      .expect(200)
      .expect((r) => {
        expect(r.body).toMatchObject([{ slug: pro.slug, offers: [{ id: pro.offerId, priceMinor: 0 }] }]);
        expect(r.text).not.toContain(pro.id);
      });
    await f.api
      .put('/professionals/me/offers/' + pro.offerId)
      .auth(other.token, { type: 'bearer' })
      .send(other.offer)
      .expect(404);
    await f.api
      .put('/professionals/me')
      .auth(pro.token, { type: 'bearer' })
      .send({ ...pro.profile, biography: 'Unpublished edit' })
      .expect(200);
    await f.api
      .get('/professionals/' + pro.slug)
      .expect(200)
      .expect((r) => expect(r.body).toMatchObject({ biography: 'Consulting' }));
    await f.api.put('/professionals/me/unpublish').auth(pro.token, { type: 'bearer' }).expect(200);
    await f.api.get('/professionals/' + pro.slug).expect(404);
    await f.api.get('/professionals').query({ q: pro.slug }).expect(200, []);
  } finally {
    await f.close();
  }
});
