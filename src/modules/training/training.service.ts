import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';

import type { Prisma } from '../../generated/prisma/client.js';
import { CoachingService } from '../coaching/coaching.service.js';
import { PlanVersionsService } from '../planVersions/planVersions.service.js';

import type { dayQuery, exerciseInput, exerciseSchema, period, setInput, startInput } from './training.schemas.js';
import { planInput } from './training.schemas.js';

const progress = {
  exercises: { orderBy: { exerciseIndex: 'asc' } },
  sets: { orderBy: [{ exerciseIndex: 'asc' }, { setIndex: 'asc' }] },
} satisfies Prisma.WorkoutSessionInclude;
@Injectable()
export class TrainingService {
  constructor(
    @Inject(CoachingService) private readonly coaching: CoachingService,
    @Inject(PlanVersionsService) private readonly versions: PlanVersionsService,
  ) {}
  create(actor: string, id: string, input: z.infer<typeof planInput>) {
    return this.versions.create(actor, id, 'PERSONAL_TRAINING', input);
  }
  update(actor: string, id: string, planId: string, input: z.infer<typeof planInput>) {
    return this.versions.update(actor, id, 'PERSONAL_TRAINING', planId, input);
  }
  publish(actor: string, id: string, planId: string) {
    return this.versions.publish(actor, id, 'PERSONAL_TRAINING', planId);
  }
  copy(actor: string, id: string, planId: string) {
    return this.versions.copy(actor, id, 'PERSONAL_TRAINING', planId);
  }
  history(actor: string, id: string) {
    return this.versions.history(actor, id, 'PERSONAL_TRAINING');
  }

  library(actor: string, id: string) {
    return this.coaching.withAccess(actor, id, { role: 'professional', modality: 'PERSONAL_TRAINING' }, async (tx) => {
      const plans = await tx.planVersion.findMany({
        where: { contract: { professionalId: actor, modality: 'PERSONAL_TRAINING' } },
        orderBy: { createdAt: 'desc' },
        select: { content: true },
      });
      const exercises = new Map<string, z.infer<typeof exerciseSchema>>();
      for (const p of plans) {
        for (const w of planInput.parse(p.content).workouts) {
          for (const ex of w.exercises) {
            if (!exercises.has(ex.key)) {
              exercises.set(ex.key, ex);
            }
          }
        }
      }
      return [...exercises.values()];
    });
  }

  day(actor: string, id: string, { day }: z.infer<typeof dayQuery>) {
    return this.coaching.withAccess(actor, id, { modality: 'PERSONAL_TRAINING' }, async (tx) => {
      const plan = await tx.planVersion.findFirst({
        where: { contractId: id, publishedAt: { lte: new Date(day + 'T23:59:59.999Z') } },
        orderBy: [{ publishedAt: 'desc' }, { version: 'desc' }],
      });
      const weekday = new Date(day + 'T12:00:00Z').getUTCDay() || 7;
      const workoutIndices = plan
        ? planInput
            .parse(plan.content)
            .workouts.flatMap((w, i) => (!w.weekdays.length || w.weekdays.includes(weekday) ? [i] : []))
        : [];
      const sessions = await tx.workoutSession.findMany({
        where: { day, plan: { contractId: id } },
        include: progress,
      });
      return { plan, workoutIndices, sessions };
    });
  }

  start(actor: string, id: string, planId: string, { day, workoutIndex }: z.infer<typeof startInput>) {
    return this.coaching.withAccess(
      actor,
      id,
      { modality: 'PERSONAL_TRAINING', role: 'client', active: true },
      async (tx) => {
        const key = { planId, day, workoutIndex };
        const plan = await tx.planVersion.findFirst({
          where: { id: planId, contractId: id, publishedAt: { not: null } },
        });
        if (!plan) {
          throw new NotFoundException('Published plan not found');
        }
        const existing = await tx.workoutSession.findUnique({
          where: { planId_day_workoutIndex: key },
          include: progress,
        });
        if (existing) {
          return existing;
        }
        if (day !== new Date().toISOString().slice(0, 10) || !planInput.parse(plan.content).workouts[workoutIndex]) {
          throw new BadRequestException('Invalid workout or session day');
        }
        const latest = await tx.planVersion.findFirst({
          where: { contractId: id, publishedAt: { not: null } },
          orderBy: [{ publishedAt: 'desc' }, { version: 'desc' }],
        });
        if (latest?.id !== planId) {
          throw new ConflictException('This version has been superseded');
        }
        return tx.workoutSession.create({ data: key, include: progress });
      },
    );
  }

  private async load(tx: Prisma.TransactionClient, id: string, sessionId: string) {
    const session = await tx.workoutSession.findFirst({
      where: { id: sessionId, plan: { contractId: id } },
      include: { plan: true },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }

  exercise(actor: string, id: string, sessionId: string, input: z.infer<typeof exerciseInput>) {
    return this.coaching.withAccess(
      actor,
      id,
      { role: 'client', active: true, modality: 'PERSONAL_TRAINING' },
      async (tx) => {
        const session = await this.load(tx, id, sessionId);
        if (session.finishedAt) {
          throw new ConflictException('Session complete');
        }
        const { exerciseIndex, skipped, note } = input;
        if (!planInput.parse(session.plan.content).workouts[session.workoutIndex].exercises[exerciseIndex]) {
          throw new BadRequestException('Unknown exercise');
        }
        if (skipped && (await tx.setExecution.count({ where: { sessionId, exerciseIndex } }))) {
          throw new ConflictException('An exercise with recorded sets cannot be skipped');
        }
        await tx.exerciseExecution.upsert({
          where: { sessionId_exerciseIndex: { sessionId, exerciseIndex } },
          create: { sessionId, ...input },
          update: { skipped, note: note ?? null },
        });
        return tx.workoutSession.findUniqueOrThrow({ where: { id: sessionId }, include: progress });
      },
    );
  }
  record(actor: string, id: string, sessionId: string, input: z.infer<typeof setInput>) {
    return this.coaching.withAccess(
      actor,
      id,
      { role: 'client', active: true, modality: 'PERSONAL_TRAINING' },
      async (tx) => {
        const session = await this.load(tx, id, sessionId);
        if (session.finishedAt) {
          throw new ConflictException('Session complete');
        }
        const { exerciseIndex, setIndex, reps, seconds, loadKg } = input;
        const ex = planInput.parse(session.plan.content).workouts[session.workoutIndex].exercises[exerciseIndex];
        if (
          !ex ||
          setIndex >= ex.sets ||
          (ex.mode === 'TIME' ? !seconds || reps !== undefined : !reps || seconds !== undefined)
        ) {
          throw new BadRequestException('Set does not match the prescription');
        }
        const exercise = await tx.exerciseExecution.findUnique({
          where: { sessionId_exerciseIndex: { sessionId, exerciseIndex } },
        });
        if (exercise?.skipped) {
          throw new ConflictException('Exercise marked skipped');
        }
        await tx.setExecution.upsert({
          where: { sessionId_exerciseIndex_setIndex: { sessionId, exerciseIndex, setIndex } },
          create: { sessionId, ...input },
          update: { reps: reps ?? null, seconds: seconds ?? null, loadKg: loadKg ?? null },
        });
        return tx.workoutSession.findUniqueOrThrow({ where: { id: sessionId }, include: progress });
      },
    );
  }
  finish(actor: string, id: string, sessionId: string) {
    return this.coaching.withAccess(
      actor,
      id,
      { role: 'client', active: true, modality: 'PERSONAL_TRAINING' },
      async (tx) => {
        const session = await this.load(tx, id, sessionId);
        return tx.workoutSession.update({
          where: { id: sessionId },
          data: { finishedAt: session.finishedAt ?? new Date() },
          include: progress,
        });
      },
    );
  }
  sessions(actor: string, id: string, { from, to, exerciseKey }: z.infer<typeof period>) {
    return this.coaching.withAccess(actor, id, { modality: 'PERSONAL_TRAINING' }, async (tx) => {
      const sessions = await tx.workoutSession.findMany({
        where: { plan: { contractId: id }, day: { gte: from, lte: to } },
        include: { ...progress, plan: true },
        orderBy: [{ day: 'asc' }, { startedAt: 'asc' }],
      });
      return exerciseKey
        ? sessions.filter((s) =>
            planInput.parse(s.plan.content).workouts[s.workoutIndex].exercises.some((e) => e.key === exerciseKey),
          )
        : sessions;
    });
  }
}
