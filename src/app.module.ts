import { Module } from '@nestjs/common';

import { ConfigurationModule } from './config/configuration.module.js';
import { AssessmentsModule } from './modules/assessments/assessments.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CoachingModule } from './modules/coaching/coaching.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ProfilesModule } from './modules/profiles/profiles.module.js';

@Module({ imports: [AssessmentsModule, CoachingModule, ConfigurationModule, AuthModule, HealthModule, ProfilesModule] })
export class AppModule {}
