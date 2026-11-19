import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CoachingModule } from '../coaching/coaching.module.js';

import { MessagingController } from './messaging.controller.js';
import { MessagingService } from './messaging.service.js';
@Module({
  imports: [AuthModule, DatabaseModule, CoachingModule],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [],
})
export class MessagingModule {}
