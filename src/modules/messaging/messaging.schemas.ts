import { z } from 'zod';

export const page = z.strictObject({
  before: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export const messageInput = z.strictObject({ requestKey: z.uuid(), body: z.string().trim().min(1).max(4000) });
export const messageView = z.object({
  id: z.uuid(),
  contractId: z.uuid(),
  senderId: z.uuid(),
  body: z.string(),
  createdAt: z.iso.datetime(),
  readAt: z.iso.datetime().nullable(),
});
export const messagePage = z.object({ items: z.array(messageView), next: z.uuid().nullable(), unread: z.int() });
export const notificationView = z.object({
  id: z.uuid(),
  kind: z.string(),
  href: z.string(),
  createdAt: z.iso.datetime(),
  readAt: z.iso.datetime().nullable(),
});
export const notificationPage = z.object({
  items: z.array(notificationView),
  next: z.uuid().nullable(),
  unread: z.int(),
});
