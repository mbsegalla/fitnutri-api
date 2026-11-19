import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CoachingModule } from '../coaching/coaching.module.js';

import { AssessmentsController } from './assessments.controller.js';
import { AssessmentsService } from './assessments.service.js';
@Module({
  imports: [AuthModule, DatabaseModule, CoachingModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [],
})
export class AssessmentsModule {}
