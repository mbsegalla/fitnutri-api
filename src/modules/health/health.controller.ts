import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../../infrastructure/database/prisma.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly database: PrismaService) {}

  @Get('live')
  @ApiOperation({ summary: 'Check whether the API is running' })
  @ApiOkResponse({
    description: 'The HTTP process is responding.',
    schema: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', enum: ['ok'], example: 'ok' } },
    },
  })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check whether the API can reach PostgreSQL' })
  @ApiOkResponse({
    description: 'The database answered the readiness query.',
    schema: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', enum: ['ready'], example: 'ready' } },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'The database did not answer the readiness query.',
    schema: {
      type: 'object',
      required: ['statusCode', 'message', 'error'],
      properties: {
        statusCode: { type: 'integer', example: 503 },
        message: { type: 'string', example: 'Database unavailable' },
        error: { type: 'string', example: 'Service Unavailable' },
      },
    },
  })
  async ready() {
    try {
      await this.database.checkConnection();
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }

    return { status: 'ready' };
  }
}
