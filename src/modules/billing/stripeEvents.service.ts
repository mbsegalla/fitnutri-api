import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { z } from 'zod';

import type { Environment } from '../../config/environment.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

const envelope = z.object({
  id: z.string().startsWith('evt_'),
  object: z.literal('event'),
  type: z.string().min(1),
  created: z.int().nonnegative().max(253402300799),
  livemode: z.literal(false),
  account: z.string().optional(),
  data: z.object({ object: z.object({ id: z.string().min(1) }) }),
});

@Injectable()
export class StripeEventsService {
  constructor(
    @Inject(ConfigService) private readonly config: ConfigService<Environment, true>,
    @Inject(PrismaService) private readonly db: PrismaService,
  ) {}

  async receive(body: Buffer | undefined, signature: string | undefined) {
    const secret = this.config.get('STRIPE_TEST_WEBHOOK_SECRET', { infer: true });

    if (!secret) {
      throw new ServiceUnavailableException('Stripe sandbox webhook is not configured');
    }

    if (!body || !signature) {
      throw new BadRequestException('Signed body required');
    }

    let verified: unknown;

    try {
      verified = Stripe.webhooks.constructEvent(body, signature, secret);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook');
    }

    const parsed = envelope.safeParse(verified);

    if (!parsed.success) {
      throw new BadRequestException('Expected a sandbox event with an object ID');
    }

    const event = parsed.data;
    await this.db.stripeEvent.createMany({
      data: [
        {
          id: event.id,
          type: event.type,
          objectId: event.data.object.id,
          providerAccount: event.account,
          occurredAt: new Date(event.created * 1000),
        },
      ],
      skipDuplicates: true,
    });

    return { received: true };
  }
}
