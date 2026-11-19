import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CoachingModule } from '../coaching/coaching.module.js';

import { FollowUpController } from './followUp.controller.js';
import { FollowUpService } from './followUp.service.js';
@Module({
  imports: [AuthModule, DatabaseModule, CoachingModule],
  controllers: [FollowUpController],
  providers: [FollowUpService],
  exports: [],
})
export class FollowUpModule {}
