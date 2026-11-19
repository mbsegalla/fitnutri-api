import { z } from 'zod';
const label = z.string().trim().min(1).max(200);
const notes = z.string().trim().max(2000);
const food = z.strictObject({ name: label, portion: label, substitutions: z.array(label).max(20).default([]) });
const meal = z.strictObject({
  name: label,
  period: label.optional(),
  instructions: notes.optional(),
  foods: z.array(food).min(1).max(100),
});
export const planInput = z.strictObject({
  title: label,
  instructions: notes.optional(),
  meals: z.array(meal).min(1).max(32),
});
export const versionView = z.object({
  id: z.uuid(),
  version: z.int(),
  content: planInput,
  publishedAt: z.iso.datetime().nullable(),
});
export const historyView = z.array(versionView);
export const logInput = z.strictObject({
  day: z.iso.date(),
  mealIndex: z.int().min(0),
  status: z.enum(['COMPLETED', 'ADAPTED', 'SKIPPED']),
  comment: notes.optional(),
});
export const logView = logInput.extend({ planId: z.uuid(), comment: notes.nullable() });
export const dayQuery = z.object({ day: z.iso.date() });
export const periodQuery = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .refine((q) => q.from <= q.to, 'Invalid range');
export const logsView = z.array(logView);
export const dayView = z.object({ plan: versionView.nullable(), entries: logsView });
