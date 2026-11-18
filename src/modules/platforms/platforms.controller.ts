import { Controller, Get, Header } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { PlatformsService } from './platforms.service.js';
import {
  errorSchema,
  platformListResponseSchema,
} from './schemas/platforms.schema.js';

@ApiTags('Platforms')
@ApiResponse({ status: '4XX', standardSchema: errorSchema })
@Controller('platforms')
export class PlatformsController {
  constructor(private readonly platforms: PlatformsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiResponse({ status: 200, standardSchema: platformListResponseSchema })
  list() {
    return this.platforms.list();
  }
}