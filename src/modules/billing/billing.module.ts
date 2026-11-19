import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';

import { StripeEventsController } from './stripeEvents.controller.js';
import { StripeEventsService } from './stripeEvents.service.js';

@Module({ imports: [DatabaseModule], providers: [StripeEventsService], controllers: [StripeEventsController] })
export class BillingModule {}
