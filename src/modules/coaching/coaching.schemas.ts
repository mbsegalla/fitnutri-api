import { z } from 'zod';

import { modalitySchema, offerSchema } from '../profiles/profiles.schemas.js';
export const requestSchema = z.strictObject({ offerId: z.uuid(), requestKey: z.uuid() });
export const transitionSchema = z.strictObject({ action: z.enum(['ACCEPT', 'DECLINE', 'CANCEL', 'END']) });
export const contractSchema = z.object({
  id: z.uuid(),
  clientId: z.uuid(),
  professionalId: z.uuid(),
  offerId: z.uuid(),
  modality: modalitySchema,
  terms: offerSchema,
  status: z.enum(['REQUESTED', 'ACCEPTED', 'DECLINED', 'CANCELED', 'ENDED']),
  payment: z.enum(['FREE', 'UNPAID', 'PAID']),
  active: z.boolean(),
  startedAt: z.iso.datetime().nullable(),
  endedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export const contractsSchema = z.array(contractSchema);
