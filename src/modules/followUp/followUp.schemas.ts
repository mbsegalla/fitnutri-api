import { z } from 'zod';

import { assessmentView } from '../assessments/assessments.schemas.js';
import { logsView } from '../nutrition/nutrition.schemas.js';
import { sessionsView } from '../training/training.schemas.js';
const text = z.string().trim().min(1).max(3000);
export const checkInput = z.strictObject({
  weekStart: z.iso.date().refine((v) => new Date(v + 'T12:00:00Z').getUTCDay() === 1, 'Use the Monday of the week'),
  adherence: z.int().min(1).max(5),
  difficulty: text.optional(),
  comments: text.optional(),
});
export const checkView = checkInput.extend({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  difficulty: text.nullable(),
  comments: text.nullable(),
  reply: text.nullable(),
  repliedAt: z.iso.datetime().nullable(),
});
export const checkViews = z.array(checkView);
export const replyInput = z.strictObject({ reply: text });
export const period = z
  .strictObject({ from: z.iso.date(), to: z.iso.date() })
  .refine(
    (p) => p.from <= p.to && Date.parse(p.to) - Date.parse(p.from) <= 365 * 86400000,
    'Choose a period up to one year',
  );
export const activity = z.object({
  contractId: z.uuid(),
  resourceId: z.uuid(),
  kind: z.string(),
  href: z.string(),
  at: z.iso.datetime(),
});
export const activities = z.array(activity);
export const evolution = z.object({
  meals: logsView,
  sessions: sessionsView,
  assessments: z.array(assessmentView),
  checkIns: checkViews,
});
