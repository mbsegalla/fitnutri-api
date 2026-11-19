import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';

import { ProfilesController } from './profiles.controller.js';
import { ProfilesService } from './profiles.service.js';
@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [],
})
export class ProfilesModule {}
