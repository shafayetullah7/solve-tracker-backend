import {
  Controller,
  Get,
  Header,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import { DatabaseService } from '../../database/database.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({
    description: 'Liveness probe — process is running',
    schema: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['ok'] } },
      required: ['status'],
    },
  })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({
    description: 'Readiness probe — database reachable',
    schema: {
      type: 'object',
      properties: { status: { type: 'string', enum: ['ready'] } },
      required: ['status'],
    },
  })
  @ApiServiceUnavailableResponse({ description: 'Database unavailable' })
  async ready(): Promise<{ status: 'ready' }> {
    try {
      await this.database.connection.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database is not reachable.',
      });
    }
    return { status: 'ready' };
  }
}