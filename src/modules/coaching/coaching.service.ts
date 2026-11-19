import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';

import type { Contract, Modality } from '../../generated/prisma/client.js';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { offerSchema } from '../profiles/profiles.schemas.js';

import type { requestSchema, transitionSchema } from './coaching.schemas.js';

export interface Access {
  role?: 'client' | 'professional';
  active?: boolean;
  modality?: Modality;
}

@Injectable()
export class CoachingService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  async request(clientId: string, input: z.infer<typeof requestSchema>) {
    const existing = () =>
      this.db.contract.findUnique({ where: { clientId_requestKey: { clientId, requestKey: input.requestKey } } });
    const replay = (contract: Contract) => {
      if (contract.offerId !== input.offerId) {
        throw new ConflictException('Request key already used for another offer');
      }

      return contract;
    };
    const prior = await existing();

    if (prior) {
      return replay(prior);
    }

    const offer = await this.db.offer.findFirst({ where: { id: input.offerId, profile: { published: true } } });

    if (!offer) {
      throw new NotFoundException('Offer not available');
    }

    if (offer.professionalId === clientId) {
      throw new BadRequestException('Cannot contract your own offer');
    }

    const { id, professionalId, ...data } = offer;
    const terms = offerSchema.parse(data);

    try {
      return await this.db.contract.create({
        data: {
          clientId,
          professionalId,
          offerId: id,
          requestKey: input.requestKey,
          terms,
          modality: terms.modality,
          payment: terms.priceMinor === 0 ? 'FREE' : 'UNPAID',
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const previous = await existing();

        if (previous) {
          return replay(previous);
        }

        throw new ConflictException('An open contract already exists for this modality');
      }

      throw error;
    }
  }

  list(accountId: string) {
    return this.db.contract.findMany({
      where: { OR: [{ clientId: accountId }, { professionalId: accountId }] },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  async get(accountId: string, id: string) {
    const contract = await this.db.contract.findFirst({
      where: { id, OR: [{ clientId: accountId }, { professionalId: accountId }] },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  withAccess<T>(
    accountId: string,
    id: string,
    access: Access,
    work: (tx: Prisma.TransactionClient, c: Contract) => Promise<T>,
  ) {
    return this.db.$transaction(async (tx) => {
      const [contract] = await tx.$queryRaw<
        Contract[]
      >`SELECT * FROM "Contract" WHERE id=${id}::uuid AND ("clientId"=${accountId}::uuid OR "professionalId"=${accountId}::uuid) FOR UPDATE`;

      if (
        !contract ||
        (access.role === 'client' && contract.clientId !== accountId) ||
        (access.role === 'professional' && contract.professionalId !== accountId) ||
        (access.modality && contract.modality !== access.modality)
      ) {
        throw new NotFoundException('Contract not found');
      }

      if (access.active && !contract.active) {
        throw new ConflictException('An active relationship is required');
      }

      return work(tx, contract);
    });
  }

  transition(accountId: string, id: string, { action }: z.infer<typeof transitionSchema>) {
    const role = action === 'END' ? undefined : action === 'CANCEL' ? 'client' : 'professional';

    return this.withAccess(accountId, id, { role }, async (tx, c) => {
      const target = { ACCEPT: 'ACCEPTED', DECLINE: 'DECLINED', CANCEL: 'CANCELED', END: 'ENDED' } as const;

      if (c.status === target[action]) {
        return c;
      }

      if (c.status !== (action === 'END' ? 'ACCEPTED' : 'REQUESTED')) {
        throw new ConflictException('Invalid contract transition');
      }

      const activate = action === 'ACCEPT' && c.payment !== 'UNPAID';

      return tx.contract.update({
        where: { id },
        data: {
          status: target[action],
          active: activate,
          startedAt: activate ? new Date() : undefined,
          endedAt: action === 'END' ? new Date() : undefined,
        },
      });
    });
  }
}
