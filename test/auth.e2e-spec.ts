import { randomUUID } from 'node:crypto';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { verify } from 'argon2';
import { SignJWT } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { z } from 'zod';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

describe('Account identity (e2e)', () => {
  const suffix = randomUUID();
  const password = 'A long test passphrase! ';
  const email = (label: string) => label + '.' + suffix + '@example.org';
  const testEmails = ['race', 'alice', 'bob', 'login'].map(email);
  const accountResponse = z.strictObject({ id: z.uuid(), email: z.email(), name: z.string() });
  const loginResponse = z.strictObject({
    accessToken: z.string(),
    tokenType: z.literal('Bearer'),
    expiresIn: z.number().positive(),
  });
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<INestApplication<App>>();
    prisma = moduleRef.get(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    try {
      await prisma.account.deleteMany({ where: { email: { in: testEmails } } });
    } finally {
      await app.close();
    }
  });

  function register(address: string, name = 'Alice') {
    return request(app.getHttpServer()).post('/auth/register').send({ name, email: address, password });
  }

  function login(address: string, candidate = password) {
    return request(app.getHttpServer()).post('/auth/login').send({ email: address, password: candidate });
  }

  it('resolves simultaneous case and whitespace variants to one account', async () => {
    const address = email('race');
    const responses = await Promise.all([register(address), register('  ' + address.toUpperCase() + '  ')]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.account.count({ where: { email: address } })).toBe(1);

    await register(address).expect(409);

    const stored = await prisma.account.findUniqueOrThrow({ where: { email: address } });

    expect(stored.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(await verify(stored.passwordHash, password)).toBe(true);
  });

  it('returns only public account fields and resolves /me from the signed subject', async () => {
    const alice = accountResponse.parse((await register(email('alice')).expect(201)).body);
    const bob = accountResponse.parse((await register(email('bob'), 'Bob').expect(201)).body);
    const first = loginResponse.parse((await login('  ' + email('alice').toUpperCase() + ' ').expect(200)).body);
    const second = loginResponse.parse((await login(email('bob')).expect(200)).body);
    const api = request(app.getHttpServer());

    expect(alice.email).toBe(email('alice'));
    expect(alice.id).not.toBe(bob.id);

    await api.get('/auth/me').auth(first.accessToken, { type: 'bearer' }).expect(200, alice);
    await api.get('/auth/me').query({ id: alice.id }).auth(second.accessToken, { type: 'bearer' }).expect(200, bob);
  });

  it('rejects incorrect passwords and unknown accounts with the same response', async () => {
    await register(email('login')).expect(201);

    const wrong = await login(email('login'), password.trim()).expect(401);
    const unknown = await login(email('unknown')).expect(401);

    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.text).not.toContain(password.trim());
  });

  it('rejects missing, invalid, incorrectly signed and expired tokens', async () => {
    const api = request(app.getHttpServer());
    const key = Buffer.from(process.env.AUTH_JWT_SECRET!, 'hex');
    const claims = new SignJWT()
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(randomUUID())
      .setIssuer('fitnutri-api')
      .setAudience('fitnutri-api')
      .setIssuedAt();
    const expired = await claims.setExpirationTime(Math.floor(Date.now() / 1000) - 10).sign(key);
    const wrongKey = await claims.setExpirationTime('5m').sign(Buffer.alloc(32));

    await api.get('/auth/me').expect(401);

    for (const token of ['invalid', wrongKey, expired]) {
      await api.get('/auth/me').auth(token, { type: 'bearer' }).expect(401);
    }
  });

  it('rejects invalid registration data without echoing the password', async () => {
    const invalid = { name: ' ', email: 'invalid', password: 'secret' };
    const response = await request(app.getHttpServer()).post('/auth/register').send(invalid).expect(400);

    expect(response.text).not.toContain(invalid.password);
  });
});
