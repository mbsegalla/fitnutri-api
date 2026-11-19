import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CoachingModule } from '../coaching/coaching.module.js';
import { PlanVersionsModule } from '../planVersions/planVersions.module.js';

import { TrainingController } from './training.controller.js';
import { TrainingService } from './training.service.js';
@Module({
  imports: [AuthModule, DatabaseModule, CoachingModule, PlanVersionsModule],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [],
})
export class TrainingModule {}
