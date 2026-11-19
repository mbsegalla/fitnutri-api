import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CoachingModule } from '../coaching/coaching.module.js';
import { PlanVersionsModule } from '../planVersions/planVersions.module.js';

import { NutritionController } from './nutrition.controller.js';
import { NutritionService } from './nutrition.service.js';

@Module({
  imports: [AuthModule, DatabaseModule, CoachingModule, PlanVersionsModule],
  controllers: [NutritionController],
  providers: [NutritionService],
  exports: [],
})
export class NutritionModule {}
