import { z } from 'zod';

const label = z.string().trim().min(1).max(200);
const note = z.string().trim().max(2000);
const baseExercise = z.object({
  key: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(100),
  name: label,
  sets: z.int().min(1).max(100),
  loadKg: z.number().min(0).max(2000).optional(),
  restSeconds: z.int().min(0).max(3600).optional(),
  instructions: note.optional(),
});
export const exerciseSchema = z.discriminatedUnion('mode', [
  baseExercise.extend({ mode: z.literal('REPS'), reps: z.int().min(1).max(1000) }).strict(),
  baseExercise.extend({ mode: z.literal('TIME'), seconds: z.int().min(1).max(86400) }).strict(),
]);
export const libraryView = z.array(exerciseSchema);
export const planInput = z.strictObject({
  title: label,
  workouts: z
    .array(
      z.strictObject({
        name: label,
        weekdays: z.array(z.int().min(1).max(7)).max(7).default([]),
        exercises: z.array(exerciseSchema).min(1).max(100),
      }),
    )
    .min(1)
    .max(32),
});
export const versionView = z.object({
  id: z.uuid(),
  version: z.int(),
  content: planInput,
  publishedAt: z.iso.datetime().nullable(),
});
export const historyView = z.array(versionView);
export const startInput = z.strictObject({ day: z.iso.date(), workoutIndex: z.int().min(0) });
export const exerciseInput = z.strictObject({
  exerciseIndex: z.int().min(0),
  skipped: z.boolean(),
  note: note.optional(),
});
export const setInput = z.strictObject({
  exerciseIndex: z.int().min(0),
  setIndex: z.int().min(0),
  reps: z.int().min(1).max(1000).optional(),
  seconds: z.int().min(1).max(86400).optional(),
  loadKg: z.number().min(0).max(2000).optional(),
});
export const sessionView = z.object({
  id: z.uuid(),
  planId: z.uuid(),
  day: z.iso.date(),
  workoutIndex: z.int(),
  finishedAt: z.iso.datetime().nullable(),
  exercises: z.array(exerciseInput.extend({ note: note.nullable() })),
  sets: z.array(
    setInput.extend({ reps: z.int().nullable(), seconds: z.int().nullable(), loadKg: z.number().nullable() }),
  ),
});
export const sessionsView = z.array(sessionView.extend({ plan: versionView }));
export const period = z
  .object({ from: z.iso.date(), to: z.iso.date(), exerciseKey: z.string().max(100).optional() })
  .refine((p) => p.from <= p.to);
export const dayQuery = z.object({ day: z.iso.date() });
export const dayView = z.object({
  plan: versionView.nullable(),
  workoutIndices: z.array(z.int()),
  sessions: z.array(sessionView),
});
