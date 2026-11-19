import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';

import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { CoachingService } from '../coaching/coaching.service.js';

import type { checkInput, period, replyInput } from './followUp.schemas.js';

function range({ from, to }: z.infer<typeof period>) {
  return { gte: new Date(from + 'T00:00:00Z'), lte: new Date(to + 'T23:59:59.999Z') };
}
function item(contractId: string, resourceId: string, kind: string, path: string, at: Date) {
  return { contractId, resourceId, kind, href: '/contracts/' + contractId + path, at };
}
@Injectable()
export class FollowUpService {
  constructor(
    @Inject(CoachingService) private readonly coaching: CoachingService,
    @Inject(PrismaService) private readonly db: PrismaService,
  ) {}
  submit(actor: string, id: string, input: z.infer<typeof checkInput>) {
    return this.coaching.withAccess(actor, id, { role: 'client', active: true }, async (tx) => {
      if (input.weekStart > new Date().toISOString().slice(0, 10)) {
        throw new BadRequestException('Future check-in');
      }
      const prior = await tx.checkIn.findUnique({
        where: { contractId_weekStart: { contractId: id, weekStart: input.weekStart } },
      });
      if (prior?.repliedAt) {
        throw new ConflictException('A reviewed check-in is final');
      }
      return tx.checkIn.upsert({
        where: { contractId_weekStart: { contractId: id, weekStart: input.weekStart } },
        create: { contractId: id, ...input },
        update: { adherence: input.adherence, difficulty: input.difficulty ?? null, comments: input.comments ?? null },
      });
    });
  }
  checks(actor: string, id: string) {
    return this.coaching.withAccess(actor, id, {}, (tx) =>
      tx.checkIn.findMany({ where: { contractId: id }, orderBy: { weekStart: 'desc' } }),
    );
  }
  reply(actor: string, id: string, checkId: string, { reply }: z.infer<typeof replyInput>) {
    return this.coaching.withAccess(actor, id, { role: 'professional', active: true }, async (tx) => {
      const prior = await tx.checkIn.findFirst({ where: { id: checkId, contractId: id } });
      if (!prior) {
        throw new NotFoundException('Check-in not found');
      }
      if (prior.reply === reply) {
        return prior;
      }
      return tx.checkIn.update({ where: { id: checkId }, data: { reply, repliedAt: new Date() } });
    });
  }
  progress(actor: string, id: string, p: z.infer<typeof period>) {
    return this.coaching.withAccess(actor, id, {}, async (tx) => {
      const day = { gte: p.from, lte: p.to };
      const meals = await tx.mealLog.findMany({
        where: { day, plan: { contractId: id } },
        orderBy: [{ day: 'asc' }, { mealIndex: 'asc' }],
      });
      const sessions = await tx.workoutSession.findMany({
        where: { day, plan: { contractId: id } },
        orderBy: { startedAt: 'asc' },
        include: { plan: true, exercises: true, sets: { orderBy: [{ exerciseIndex: 'asc' }, { setIndex: 'asc' }] } },
      });
      const assessments = await tx.assessment.findMany({
        where: { contractId: id, assessedAt: range(p) },
        orderBy: { assessedAt: 'asc' },
      });
      const checkIns = await tx.checkIn.findMany({
        where: { contractId: id, weekStart: day },
        orderBy: { weekStart: 'asc' },
      });
      return { meals, sessions, assessments, checkIns };
    });
  }
  timeline(actor: string, id: string, p: z.infer<typeof period>) {
    return this.coaching.withAccess(actor, id, {}, async (tx, c) => {
      const between = range(p);
      const plans = await tx.planVersion.findMany({
        where: { contractId: id, publishedAt: between },
        select: { id: true, publishedAt: true },
      });
      const checkIns = await tx.checkIn.findMany({
        where: { contractId: id, OR: [{ createdAt: between }, { repliedAt: between }] },
      });
      const documents = await tx.careDocument.findMany({
        where: { contractId: id, OR: [{ createdAt: between }, { publishedAt: between }] },
        select: { id: true, createdAt: true, publishedAt: true },
      });
      const assessments = await tx.assessment.findMany({
        where: { contractId: id, assessedAt: between },
        select: { id: true, assessedAt: true },
      });
      const section = c.modality === 'NUTRITION' ? 'nutrition' : 'training';
      return [
        item(id, id, 'REQUESTED', '', c.createdAt),
        ...(c.startedAt ? [item(id, id, 'STARTED', '', c.startedAt)] : []),
        ...(c.endedAt ? [item(id, id, 'ENDED', '', c.endedAt)] : []),
        ...plans.flatMap((v) =>
          v.publishedAt ? [item(id, v.id, 'PLAN_PUBLISHED', '/' + section + '/plans', v.publishedAt)] : [],
        ),
        ...assessments.map((a) => item(id, a.id, 'ASSESSMENT', '/assessments', a.assessedAt)),
        ...documents.flatMap((d) => [
          item(id, d.id, 'DOCUMENT', '/documents', d.createdAt),
          ...(d.publishedAt ? [item(id, d.id, 'FEEDBACK', '/documents', d.publishedAt)] : []),
        ]),
        ...checkIns.flatMap((x) => [
          item(id, x.id, 'CHECK_IN', '/check-ins', x.createdAt),
          ...(x.repliedAt ? [item(id, x.id, 'REPLY', '/check-ins', x.repliedAt)] : []),
        ]),
      ]
        .filter((e) => e.at >= between.gte && e.at <= between.lte)
        .sort((a, b) => b.at.getTime() - a.at.getTime() || a.resourceId.localeCompare(b.resourceId));
    });
  }
  async dashboard(professionalId: string) {
    const active = { professionalId, active: true };
    const [requests, documents, checks, plans] = await this.db.$transaction([
      this.db.contract.findMany({ where: { professionalId, status: 'REQUESTED' } }),
      this.db.careDocument.findMany({
        where: { contract: active, kind: 'EXAM', publishedAt: null },
        select: { id: true, contractId: true, createdAt: true },
      }),
      this.db.checkIn.findMany({
        where: { contract: active, repliedAt: null },
        select: { id: true, contractId: true, createdAt: true },
      }),
      this.db.contract.findMany({ where: { ...active, plans: { none: { publishedAt: { not: null } } } } }),
    ]);
    return [
      ...requests.map((c) => item(c.id, c.id, 'REQUEST_PENDING', '', c.createdAt)),
      ...documents.map((d) => item(d.contractId, d.id, 'EXAM_PENDING', '/documents/' + d.id + '/file', d.createdAt)),
      ...checks.map((c) => item(c.contractId, c.id, 'CHECK_IN_PENDING', '/check-ins', c.createdAt)),
      ...plans.map((c) =>
        item(
          c.id,
          c.id,
          'PLAN_MISSING',
          c.modality === 'NUTRITION' ? '/nutrition/plans' : '/training/plans',
          c.startedAt ?? c.createdAt,
        ),
      ),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());
  }
}
