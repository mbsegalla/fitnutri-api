import type { Prisma } from '../../generated/prisma/client.js';
export function notify(tx: Prisma.TransactionClient, accountId: string, kind: string, eventKey: string, href: string) {
  return tx.notification.upsert({
    where: { accountId_eventKey: { accountId, eventKey } },
    create: { accountId, kind, eventKey, href },
    update: {},
  });
}
