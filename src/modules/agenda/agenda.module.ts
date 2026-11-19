import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CoachingModule } from '../coaching/coaching.module.js';

import { AgendaController } from './agenda.controller.js';
import { AgendaService } from './agenda.service.js';
@Module({
  imports: [AuthModule, DatabaseModule, CoachingModule],
  controllers: [AgendaController],
  providers: [AgendaService],
  exports: [],
})
export class AgendaModule {}
