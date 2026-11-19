import { z } from 'zod';

const email = z.string().trim().toLowerCase().max(254).pipe(z.email());
const password = z.string().max(128).meta({ format: 'password', writeOnly: true });

export const registerSchema = z.strictObject({
  name: z.string().trim().min(1).max(120),
  email,
  password: password.min(12).meta({ format: 'password', writeOnly: true }),
});

export const loginSchema = z.strictObject({
  email,
  password: password.min(1).meta({ format: 'password', writeOnly: true }),
});

export const publicAccountSchema = z.object({ id: z.uuid(), name: z.string(), email: z.email() });

export const tokenSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
});
