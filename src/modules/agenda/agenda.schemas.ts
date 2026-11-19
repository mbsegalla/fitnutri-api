import { z } from 'zod';
const instant = z.iso.datetime({ offset: true });
const timeZone = z
  .string()
  .max(100)
  .refine((v) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, 'Unknown IANA time zone');
const format = z.enum(['ONLINE', 'IN_PERSON']);
export const slotInput = z
  .strictObject({ startsAt: instant, endsAt: instant, timeZone, format })
  .refine(
    (v) => Date.parse(v.endsAt) > Date.parse(v.startsAt) && Date.parse(v.endsAt) - Date.parse(v.startsAt) <= 86400000,
    'Invalid slot duration',
  );
export const slotView = z.object({ id: z.uuid(), startsAt: instant, endsAt: instant, timeZone, format });
export const slots = z.array(slotView);
export const booking = z.strictObject({ slotId: z.uuid(), requestKey: z.uuid() });
export const move = z.strictObject({ slotId: z.uuid(), expectedRevision: z.int().positive() });
export const appointment = z.object({
  id: z.uuid(),
  contractId: z.uuid(),
  revision: z.int(),
  slot: slotView,
  canceledAt: instant.nullable(),
});
export const appointments = z.array(appointment);
export const room = z.object({ url: z.url(), token: z.string(), expiresAt: instant });
