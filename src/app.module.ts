import { Module } from '@nestjs/common';

import { ConfigurationModule } from './config/configuration.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { HealthModule } from './modules/health/health.module.js';

@Module({ imports: [ConfigurationModule, AuthModule, HealthModule] })
export class AppModule {}
