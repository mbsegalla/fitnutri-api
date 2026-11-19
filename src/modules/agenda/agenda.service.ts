import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';
import type { z } from 'zod';

import type { Environment } from '../../config/environment.js';
import type { Contract, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { CoachingService } from '../coaching/coaching.service.js';
import { notify } from '../messaging/notify.js';

import type { booking, move, slotInput } from './agenda.schemas.js';

async function appointmentAlerts(
  tx: Prisma.TransactionClient,
  c: Contract,
  id: string,
  revision: number,
  kind: string,
) {
  const href = '/contracts/' + c.id + '/appointments';
  for (const participant of [c.clientId, c.professionalId]) {
    await notify(tx, participant, kind, 'appointment:' + id + ':' + revision, href);
  }
}
async function availableSlot(tx: Prisma.TransactionClient, c: Contract, slotId: string, exclude?: string) {
  // Serialize bookings across contracts, including accounts acting in either role.
  await tx.$queryRaw`SELECT id FROM "Account" WHERE id IN (${c.clientId}::uuid,${c.professionalId}::uuid) ORDER BY id FOR UPDATE`;
  const slot = await tx.availabilitySlot.findFirst({ where: { id: slotId, professionalId: c.professionalId } });
  if (!slot) {
    throw new NotFoundException('Slot not found');
  }
  if (slot.startsAt <= new Date()) {
    throw new ConflictException('Slot has already started');
  }
  const participants = [c.clientId, c.professionalId];
  const conflict = await tx.appointment.count({
    where: {
      id: exclude ? { not: exclude } : undefined,
      canceledAt: null,
      slot: { startsAt: { lt: slot.endsAt }, endsAt: { gt: slot.startsAt } },
      contract: { OR: [{ clientId: { in: participants } }, { professionalId: { in: participants } }] },
    },
  });
  if (conflict) {
    throw new ConflictException('Appointment time is already reserved');
  }
  return slot;
}
@Injectable()
export class AgendaService {
  constructor(
    @Inject(PrismaService) private readonly db: PrismaService,
    @Inject(CoachingService) private readonly coaching: CoachingService,
    @Inject(ConfigService) private readonly config: ConfigService<Environment, true>,
  ) {}
  addSlot(actor: string, input: z.infer<typeof slotInput>) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    if (startsAt <= new Date()) {
      throw new BadRequestException('Choose a future slot');
    }
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Account" WHERE id=${actor}::uuid FOR UPDATE`;
      const professional = await tx.professionalProfile.findUnique({ where: { accountId: actor } });
      if (!professional?.formats.includes(input.format)) {
        throw new ConflictException('Choose a format from the published profile');
      }
      const prior = await tx.availabilitySlot.findFirst({
        where: { professionalId: actor, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
      });
      if (prior) {
        if (
          +prior.startsAt === +startsAt &&
          +prior.endsAt === +endsAt &&
          prior.format === input.format &&
          prior.timeZone === input.timeZone
        ) {
          return prior;
        }
        throw new ConflictException('Availability overlaps an existing slot');
      }
      return tx.availabilitySlot.create({ data: { professionalId: actor, ...input, startsAt, endsAt } });
    });
  }
  availability(actor: string, id: string) {
    return this.coaching.withAccess(actor, id, { active: true }, (tx, c) =>
      tx.availabilitySlot.findMany({
        where: {
          professionalId: c.professionalId,
          startsAt: { gt: new Date() },
          appointments: { none: { canceledAt: null } },
        },
        orderBy: { startsAt: 'asc' },
      }),
    );
  }
  book(actor: string, id: string, input: z.infer<typeof booking>) {
    return this.coaching.withAccess(actor, id, { role: 'client', active: true }, async (tx, c) => {
      const prior = await tx.appointment.findUnique({
        where: { contractId_requestKey: { contractId: id, requestKey: input.requestKey } },
        include: { slot: true },
      });
      if (prior) {
        if (prior.initialSlotId !== input.slotId) {
          throw new ConflictException('Booking key already used');
        }
        return prior;
      }
      await availableSlot(tx, c, input.slotId);
      const saved = await tx.appointment.create({
        data: { contractId: id, ...input, initialSlotId: input.slotId },
        include: { slot: true },
      });
      await appointmentAlerts(tx, c, saved.id, saved.revision, 'APPOINTMENT_BOOKED');
      return saved;
    });
  }
  list(actor: string, id: string) {
    return this.coaching.withAccess(actor, id, {}, (tx) =>
      tx.appointment.findMany({
        where: { contractId: id },
        include: { slot: true },
        orderBy: { slot: { startsAt: 'desc' } },
      }),
    );
  }
  reschedule(actor: string, id: string, appointmentId: string, input: z.infer<typeof move>) {
    return this.coaching.withAccess(actor, id, { active: true }, async (tx, c) => {
      const existing = await tx.appointment.findFirst({
        where: { id: appointmentId, contractId: id },
        include: { slot: true },
      });
      if (!existing) {
        throw new NotFoundException('Appointment not found');
      }
      if (existing.canceledAt || existing.slot.startsAt <= new Date()) {
        throw new ConflictException('Appointment cannot be moved');
      }
      if (existing.slotId === input.slotId) {
        return existing;
      }
      if (existing.revision !== input.expectedRevision) {
        throw new ConflictException('Appointment changed');
      }
      await availableSlot(tx, c, input.slotId, appointmentId);
      const saved = await tx.appointment.update({
        where: { id: appointmentId },
        data: { slotId: input.slotId, revision: { increment: 1 } },
        include: { slot: true },
      });
      await appointmentAlerts(tx, c, saved.id, saved.revision, 'APPOINTMENT_MOVED');
      return saved;
    });
  }
  cancel(actor: string, id: string, appointmentId: string) {
    return this.coaching.withAccess(actor, id, {}, async (tx, c) => {
      const existing = await tx.appointment.findFirst({
        where: { id: appointmentId, contractId: id },
        include: { slot: true },
      });
      if (!existing) {
        throw new NotFoundException('Appointment not found');
      }
      if (existing.canceledAt) {
        return existing;
      }
      if (existing.slot.startsAt <= new Date()) {
        throw new ConflictException('Appointment already started');
      }
      const saved = await tx.appointment.update({
        where: { id: appointmentId },
        data: { canceledAt: new Date(), revision: { increment: 1 } },
        include: { slot: true },
      });
      await appointmentAlerts(tx, c, saved.id, saved.revision, 'APPOINTMENT_CANCELED');
      return saved;
    });
  }
  join(actor: string, id: string, appointmentId: string) {
    return this.coaching.withAccess(actor, id, { active: true }, async (tx) => {
      const a = await tx.appointment.findFirst({
        where: { id: appointmentId, contractId: id },
        include: { slot: true },
      });
      if (!a) {
        throw new NotFoundException('Appointment not found');
      }
      const now = Date.now();
      if (a.canceledAt || a.slot.format !== 'ONLINE' || now < +a.slot.startsAt - 15 * 60000 || now >= +a.slot.endsAt) {
        throw new ConflictException('Online room is not available now');
      }
      const url = this.config.get('LIVEKIT_URL', { infer: true });
      const key = this.config.get('LIVEKIT_API_KEY', { infer: true });
      const secret = this.config.get('LIVEKIT_API_SECRET', { infer: true });
      if (!url || !key || !secret) {
        throw new ServiceUnavailableException('Video is not configured');
      }
      const exp = Math.floor(Math.min(now + 120000, +a.slot.endsAt) / 1000);
      const grant = new AccessToken(key, secret, { identity: actor, ttl: Math.max(1, exp - Math.floor(now / 1000)) });
      grant.addGrant({
        roomJoin: true,
        room: 'consultation-' + a.id + '-' + a.revision,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });
      const token = await grant.toJwt();
      return { url, token, expiresAt: new Date(exp * 1000) };
    });
  }
}
