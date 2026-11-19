import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { Modality, Prisma } from '../../generated/prisma/client.js';
import { CoachingService } from '../coaching/coaching.service.js';
import { notify } from '../messaging/notify.js';

@Injectable()
export class PlanVersionsService {
  constructor(@Inject(CoachingService) private readonly coaching: CoachingService) {}

  private async newVersion(tx: Prisma.TransactionClient, id: string, content: Prisma.InputJsonValue) {
    const previous = await tx.planVersion.aggregate({ where: { contractId: id }, _max: { version: true } });

    return tx.planVersion.create({ data: { contractId: id, content, version: (previous._max.version ?? 0) + 1 } });
  }

  create(actor: string, id: string, modality: Modality, content: Prisma.InputJsonValue) {
    return this.coaching.withAccess(actor, id, { role: 'professional', modality, active: true }, (tx) =>
      this.newVersion(tx, id, content),
    );
  }

  update(actor: string, id: string, modality: Modality, planId: string, content: Prisma.InputJsonValue) {
    return this.coaching.withAccess(actor, id, { role: 'professional', modality, active: true }, async (tx) => {
      const [draft] = await tx.planVersion.updateManyAndReturn({
        where: { contractId: id, id: planId, publishedAt: null },
        data: { content },
      });

      if (!draft) {
        throw new ConflictException('Only a draft in this contract can be edited');
      }

      return draft;
    });
  }

  copy(actor: string, id: string, modality: Modality, planId: string) {
    return this.coaching.withAccess(actor, id, { role: 'professional', modality, active: true }, async (tx) => {
      const source = await tx.planVersion.findFirst({ where: { id: planId, contractId: id } });

      if (!source || source.content === null) {
        throw new NotFoundException('Plan not found');
      }

      return this.newVersion(tx, id, source.content);
    });
  }

  publish(actor: string, id: string, modality: Modality, planId: string) {
    return this.coaching.withAccess(actor, id, { role: 'professional', modality, active: true }, async (tx, c) => {
      const plan = await tx.planVersion.findFirst({ where: { id: planId, contractId: id } });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      if (plan.publishedAt) {
        return plan;
      }

      const section = modality === 'NUTRITION' ? 'nutrition' : 'training';
      await notify(
        tx,
        c.clientId,
        'PLAN_PUBLISHED',
        'plan:' + planId,
        '/contracts/' + id + '/' + section + '/plans/' + planId,
      );

      return tx.planVersion.update({ where: { id: planId }, data: { publishedAt: new Date() } });
    });
  }

  get(actor: string, id: string, modality: Modality, planId: string) {
    return this.coaching.withAccess(actor, id, { modality }, async (tx, c) => {
      const plan = await tx.planVersion.findFirst({
        where: { id: planId, contractId: id, publishedAt: actor === c.clientId ? { not: null } : undefined },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      return plan;
    });
  }

  history(actor: string, id: string, modality: Modality) {
    return this.coaching.withAccess(actor, id, { modality }, (tx, c) =>
      tx.planVersion.findMany({
        where: { contractId: id, publishedAt: actor === c.clientId ? { not: null } : undefined },
        orderBy: [{ publishedAt: { sort: 'desc', nulls: 'first' } }, { version: 'desc' }],
      }),
    );
  }
}
