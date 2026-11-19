import { z } from 'zod';
export const modalitySchema = z.enum(['NUTRITION', 'PERSONAL_TRAINING']);
const format = z.enum(['ONLINE', 'IN_PERSON']);
const text = z.string().trim().min(1).max(200);
const location = z.string().trim().min(1).max(120);
const profileFields = z.strictObject({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
  displayName: text,
  biography: z.string().trim().min(1).max(2000),
  photoUrl: z
    .url({ protocol: /^https$/ })
    .max(2048)
    .optional(),
  specialties: z.array(text).max(20),
  modalities: z.array(modalitySchema).min(1).max(2),
  formats: z.array(format).min(1).max(2),
  city: location.optional(),
  state: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
});
export const draftSchema = profileFields.partial();
export const profileSchema = profileFields.refine(
  (p) => !p.formats.includes('IN_PERSON') || (p.city && p.state),
  'In-person care requires city and state',
);
export const offerSchema = z.strictObject({
  title: text,
  description: z.string().trim().min(1).max(2000),
  modality: modalitySchema,
  priceMinor: z.int().min(0).max(2147483647),
  currency: z.string().regex(/^[A-Z]{3}$/),
  durationDays: z.int().min(1).max(3650),
  included: z.array(text).min(1).max(50),
});
export const savedOfferSchema = offerSchema.extend({ id: z.uuid() });
export const publicProfileSchema = profileFields.extend({
  offers: z.array(savedOfferSchema),
  photoUrl: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
});
export const ownerProfileSchema = z.object({
  draft: draftSchema,
  published: z.boolean(),
  offers: z.array(savedOfferSchema),
});
export const pageSchema = z.object({
  q: text.optional(),
  modality: modalitySchema.optional(),
  format: format.optional(),
  city: location.optional(),
  state: z.string().length(2).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const directorySchema = z.array(publicProfileSchema);
