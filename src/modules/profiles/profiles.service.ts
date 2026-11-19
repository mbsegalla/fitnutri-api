import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';

import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

import { draftSchema, offerSchema, pageSchema, profileSchema } from './profiles.schemas.js';

const offerFields = {
  id: true,
  title: true,
  description: true,
  modality: true,
  priceMinor: true,
  currency: true,
  durationDays: true,
  included: true,
} as const;
const ownerFields = { draft: true, published: true, offers: { select: offerFields, orderBy: { id: 'asc' } } } as const;
const publicFields = {
  displayName: true,
  biography: true,
  slug: true,
  photoUrl: true,
  specialties: true,
  modalities: true,
  formats: true,
  city: true,
  state: true,
  offers: { select: offerFields, orderBy: { id: 'asc' } },
} as const;

@Injectable()
export class ProfilesService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  save(accountId: string, draft: z.infer<typeof draftSchema>) {
    if (draft.slug === 'me') {
      throw new BadRequestException('Reserved profile slug');
    }

    return this.db.professionalProfile.upsert({
      where: { accountId },
      create: { accountId, draft },
      update: { draft },
      select: ownerFields,
    });
  }

  async mine(accountId: string) {
    const profile = await this.db.professionalProfile.findUnique({ where: { accountId }, select: ownerFields });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }

  async publish(accountId: string) {
    const current = await this.mine(accountId);
    const result = profileSchema.safeParse(current.draft);

    if (!result.success) {
      throw new BadRequestException('Complete the profile and in-person location before publishing');
    }

    if (current.offers.some((o) => !result.data.modalities.includes(o.modality))) {
      throw new ConflictException('An offer uses a modality missing from this profile');
    }

    try {
      return await this.db.professionalProfile.update({
        where: { accountId },
        data: {
          ...result.data,
          city: result.data.city ?? null,
          state: result.data.state ?? null,
          photoUrl: result.data.photoUrl ?? null,
          published: true,
        },
        select: ownerFields,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Slug already in use');
      }

      throw error;
    }
  }

  async unpublish(accountId: string) {
    await this.mine(accountId);

    return this.db.professionalProfile.update({
      where: { accountId },
      data: { published: false },
      select: ownerFields,
    });
  }

  private async checkModality(accountId: string, modality: z.infer<typeof offerSchema>['modality']) {
    const profile = await this.db.professionalProfile.findUnique({ where: { accountId } });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const allowed = profile.published ? profile.modalities : draftSchema.parse(profile.draft).modalities;

    if (!allowed?.includes(modality)) {
      throw new BadRequestException('Modality unavailable on profile');
    }
  }

  async addOffer(accountId: string, input: z.infer<typeof offerSchema>) {
    await this.checkModality(accountId, input.modality);

    return this.db.offer.create({ data: { professionalId: accountId, ...input }, select: offerFields });
  }

  async editOffer(accountId: string, id: string, input: z.infer<typeof offerSchema>) {
    await this.checkModality(accountId, input.modality);
    const updated = await this.db.offer.updateManyAndReturn({
      where: { id, professionalId: accountId },
      data: input,
      select: offerFields,
    });

    if (!updated.length) {
      throw new NotFoundException('Offer not found');
    }

    return updated[0];
  }

  directory(query: z.infer<typeof pageSchema>) {
    return this.db.professionalProfile.findMany({
      where: {
        published: true,
        displayName: { contains: query.q, mode: 'insensitive' },
        modalities: query.modality ? { has: query.modality } : undefined,
        formats: query.format ? { has: query.format } : undefined,
        city: query.city ? { equals: query.city, mode: 'insensitive' } : undefined,
        state: query.state?.toUpperCase(),
      },
      orderBy: [{ displayName: 'asc' }, { slug: 'asc' }],
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      select: publicFields,
    });
  }

  async detail(slug: string) {
    const profile = await this.db.professionalProfile.findFirst({
      where: { slug, published: true },
      select: publicFields,
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    return profile;
  }
}
