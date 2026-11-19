import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/database/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  @Get('live')
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.database.checkConnection();
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
    return { status: 'ready' };
  }
}
