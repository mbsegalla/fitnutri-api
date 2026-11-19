import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';

import { AuthService } from './application/auth.service.js';
import { AccessTokenService } from './infrastructure/accessToken.service.js';
import { AccountRepository } from './infrastructure/account.repository.js';
import { AccessTokenGuard } from './presentation/accessToken.guard.js';
import { AuthController } from './presentation/auth.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AccountRepository, AccessTokenService, AuthService, AccessTokenGuard],
})
export class AuthModule {}
