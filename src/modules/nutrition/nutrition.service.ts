import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';

import { CoachingService } from '../coaching/coaching.service.js';
import { PlanVersionsService } from '../planVersions/planVersions.service.js';

import type { dayQuery, logInput, periodQuery } from './nutrition.schemas.js';
import { planInput } from './nutrition.schemas.js';

@Injectable()
export class NutritionService {
  constructor(
    @Inject(CoachingService) private readonly coaching: CoachingService,
    @Inject(PlanVersionsService) private readonly versions: PlanVersionsService,
  ) {}

  create(actor: string, id: string, input: z.infer<typeof planInput>) {
    return this.versions.create(actor, id, 'NUTRITION', input);
  }

  update(actor: string, id: string, planId: string, input: z.infer<typeof planInput>) {
    return this.versions.update(actor, id, 'NUTRITION', planId, input);
  }

  publish(actor: string, id: string, planId: string) {
    return this.versions.publish(actor, id, 'NUTRITION', planId);
  }

  copy(actor: string, id: string, planId: string) {
    return this.versions.copy(actor, id, 'NUTRITION', planId);
  }

  history(actor: string, id: string) {
    return this.versions.history(actor, id, 'NUTRITION');
  }

  day(actor: string, id: string, { day }: z.infer<typeof dayQuery>) {
    return this.coaching.withAccess(actor, id, { modality: 'NUTRITION' }, async (tx) => {
      const plan = await tx.planVersion.findFirst({
        where: { contractId: id, publishedAt: { lte: new Date(day + 'T23:59:59.999Z') } },
        orderBy: [{ publishedAt: 'desc' }, { version: 'desc' }],
      });
      const entries = await tx.mealLog.findMany({
        where: { plan: { contractId: id }, day },
        orderBy: [{ planId: 'asc' }, { mealIndex: 'asc' }],
      });

      return { plan, entries };
    });
  }

  log(actor: string, id: string, planId: string, input: z.infer<typeof logInput>) {
    return this.coaching.withAccess(actor, id, { role: 'client', modality: 'NUTRITION', active: true }, async (tx) => {
      const plan = await tx.planVersion.findFirst({
        where: { contractId: id, id: planId, publishedAt: { not: null } },
      });

      if (!plan?.publishedAt) {
        throw new NotFoundException('Published plan not found');
      }

      if (
        input.day < plan.publishedAt.toISOString().slice(0, 10) ||
        input.day > new Date().toISOString().slice(0, 10)
      ) {
        throw new BadRequestException('Invalid execution date');
      }

      const next = await tx.planVersion.findFirst({
        where: { contractId: id, publishedAt: { gt: plan.publishedAt, lt: new Date(input.day + 'T00:00:00Z') } },
      });

      if (next) {
        throw new ConflictException('Plan was superseded before this day');
      }

      if (input.mealIndex >= planInput.parse(plan.content).meals.length) {
        throw new BadRequestException('Unknown meal index');
      }

      const { day, mealIndex, status, comment } = input;

      return tx.mealLog.upsert({
        where: { planId_day_mealIndex: { planId, day, mealIndex } },
        create: { planId, ...input },
        update: { status, comment: comment ?? null },
      });
    });
  }

  logs(actor: string, id: string, { from, to }: z.infer<typeof periodQuery>) {
    return this.coaching.withAccess(actor, id, { modality: 'NUTRITION' }, (tx) =>
      tx.mealLog.findMany({
        where: { plan: { contractId: id }, day: { gte: from, lte: to } },
        orderBy: [{ day: 'asc' }, { mealIndex: 'asc' }],
      }),
    );
  }

  plan(actor: string, id: string, planId: string) {
    return this.versions.get(actor, id, 'NUTRITION', planId);
  }
}
