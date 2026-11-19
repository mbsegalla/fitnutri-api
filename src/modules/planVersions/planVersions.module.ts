import { Module } from '@nestjs/common';

import { CoachingModule } from '../coaching/coaching.module.js';

import { PlanVersionsService } from './planVersions.service.js';

@Module({ imports: [CoachingModule], providers: [PlanVersionsService], exports: [PlanVersionsService] })
export class PlanVersionsModule {}
