import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import { ProgressService } from './progress.service.js';
import {
  errorSchema,
  progressResponseSchema,
} from './schemas/progress.schema.js';

@ApiTags('Progress')
@ApiResponse({ status: '4XX', standardSchema: errorSchema })
@UseGuards(AuthSecurityGuard, AccessGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  @ApiResponse({ status: 200, standardSchema: progressResponseSchema })
  getSummaries(@Req() req: AuthenticatedRequest) {
    return this.progress.getSummaries(req.auth.user.id);
  }
}