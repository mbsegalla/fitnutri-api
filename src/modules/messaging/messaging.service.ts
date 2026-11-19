import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';

import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { CoachingService } from '../coaching/coaching.service.js';

import type { messageInput, page } from './messaging.schemas.js';
import { notify } from './notify.js';

const order = [{ createdAt: 'desc' }, { id: 'desc' }] as const;

function result<T extends { id: string }>(items: T[], limit: number, unread: number) {
  const hasMore = items.length > limit;

  return { items: items.slice(0, limit), next: hasMore ? items[limit - 1].id : null, unread };
}

@Injectable()
export class MessagingService {
  constructor(
    @Inject(CoachingService) private readonly coaching: CoachingService,
    @Inject(PrismaService) private readonly db: PrismaService,
  ) {}

  send(actor: string, id: string, input: z.infer<typeof messageInput>) {
    return this.coaching.withAccess(actor, id, { active: true }, async (tx, c) => {
      const prior = await tx.message.findUnique({
        where: { contractId_senderId_requestKey: { contractId: id, senderId: actor, requestKey: input.requestKey } },
      });

      if (prior) {
        if (prior.body !== input.body) {
          throw new ConflictException('Message key already used');
        }

        return prior;
      }

      const message = await tx.message.create({ data: { contractId: id, senderId: actor, ...input } });
      await notify(
        tx,
        actor === c.clientId ? c.professionalId : c.clientId,
        'MESSAGE',
        'message:' + message.id,
        '/contracts/' + id + '/messages',
      );

      return message;
    });
  }

  messages(actor: string, id: string, { before, limit }: z.infer<typeof page>) {
    return this.coaching.withAccess(actor, id, {}, async (tx) => {
      if (before && !(await tx.message.count({ where: { id: before, contractId: id } }))) {
        throw new BadRequestException('Unknown cursor');
      }

      const items = await tx.message.findMany({
        where: { contractId: id },
        orderBy: [...order],
        take: limit + 1,
        cursor: before ? { id: before } : undefined,
        skip: before ? 1 : 0,
      });
      const unread = await tx.message.count({ where: { contractId: id, senderId: { not: actor }, readAt: null } });

      return result(items, limit, unread);
    });
  }

  read(actor: string, id: string, messageId: string) {
    return this.coaching.withAccess(actor, id, {}, async (tx) => {
      const msg = await tx.message.findFirst({ where: { id: messageId, contractId: id, senderId: { not: actor } } });

      if (!msg) {
        throw new NotFoundException('Received message not found');
      }

      return msg.readAt ? msg : tx.message.update({ where: { id: messageId }, data: { readAt: new Date() } });
    });
  }

  async notifications(accountId: string, { before, limit }: z.infer<typeof page>) {
    if (before && !(await this.db.notification.count({ where: { accountId, id: before } }))) {
      throw new BadRequestException('Unknown cursor');
    }

    const [items, unread] = await this.db.$transaction([
      this.db.notification.findMany({
        where: { accountId },
        orderBy: [...order],
        take: limit + 1,
        cursor: before ? { id: before } : undefined,
        skip: before ? 1 : 0,
      }),
      this.db.notification.count({ where: { accountId, readAt: null } }),
    ]);

    return result(items, limit, unread);
  }

  async ack(accountId: string, notificationId: string) {
    await this.db.notification.updateMany({
      where: { accountId, id: notificationId, readAt: null },
      data: { readAt: new Date() },
    });
    const item = await this.db.notification.findFirst({ where: { accountId, id: notificationId } });

    if (!item) {
      throw new NotFoundException('Notification not found');
    }

    return item;
  }
}
