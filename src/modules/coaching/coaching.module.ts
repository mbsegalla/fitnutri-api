import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';

import { CoachingController } from './coaching.controller.js';
import { CoachingService } from './coaching.service.js';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [CoachingController],
  providers: [CoachingService],
  exports: [CoachingService],
})
export class CoachingModule {}
