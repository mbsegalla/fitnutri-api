import { Controller, Headers, HttpCode, Inject, Post, type RawBodyRequest, Req } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { z } from 'zod';

import { StripeEventsService } from './stripeEvents.service.js';

@ApiTags('Billing')
@Controller('billing/stripe')
export class StripeEventsController {
  constructor(@Inject(StripeEventsService) private readonly events: StripeEventsService) {}

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive a signed Stripe sandbox event' })
  @ApiHeader({ name: 'Stripe-Signature', required: true, description: 'Timestamp and signature supplied by Stripe.' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['id', 'object', 'type', 'livemode', 'created', 'data'],
      properties: {
        id: { type: 'string' },
        object: { type: 'string', example: 'event' },
        type: { type: 'string' },
        livemode: { type: 'boolean', example: false },
        created: { type: 'integer' },
        data: { type: 'object', properties: { object: { type: 'object', properties: { id: { type: 'string' } } } } },
      },
    },
  })
  @ApiOkResponse({ standardSchema: z.object({ received: z.boolean() }) })
  @ApiBadRequestResponse({ description: 'Invalid signature, envelope or live-mode event.' })
  @ApiServiceUnavailableResponse({ description: 'Sandbox webhook signing secret is missing.' })
  receive(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string) {
    return this.events.receive(req.rawBody, signature);
  }
}
