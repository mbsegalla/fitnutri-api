import { z } from 'zod';
const paragraph = z.string().trim().min(1).max(4000);
export const intakeSchema = z.strictObject({
  goal: paragraph,
  routine: paragraph,
  preferences: paragraph.optional(),
  restrictions: paragraph.optional(),
  difficulties: paragraph.optional(),
  dietaryHabits: paragraph.optional(),
  trainingExperience: paragraph.optional(),
});
export const intakeView = z.object({
  answers: intakeSchema,
  reviewedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
});
const measure = z.strictObject({
  label: z.string().trim().min(1).max(80),
  value: z.number().finite(),
  unit: z.string().trim().min(1).max(40),
});
export const assessmentSchema = z.strictObject({
  assessedAt: z.iso.datetime({ offset: true }),
  measures: z.array(measure).min(1).max(40),
  notes: paragraph,
});
export const assessmentViews = z.array(assessmentSchema.extend({ id: z.uuid(), authorId: z.uuid() }));
export const assessmentView = assessmentViews.element;
export const analysisSchema = z.strictObject({ text: paragraph, publish: z.boolean() });
export const documentView = z.object({
  id: z.uuid(),
  filename: z.string(),
  contentType: z.string(),
  kind: z.enum(['EXAM', 'PROGRESS_PHOTO']),
  authorId: z.uuid(),
  createdAt: z.iso.datetime(),
  publishedAnalysis: z.string().nullable(),
  publishedAt: z.iso.datetime().nullable(),
  analysisDraft: z.string().nullable().optional(),
});
export const documentViews = z.array(documentView);
