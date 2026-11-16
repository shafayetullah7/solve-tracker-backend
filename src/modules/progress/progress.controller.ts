import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import { ProgressService } from './progress.service.js';
import {
  activityQuerySchema,
  progressActivityResponseSchema,
  type ActivityQuery,
} from './schemas/activity.schema.js';
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

  @Get('activity')
  @ApiResponse({ status: 200, standardSchema: progressActivityResponseSchema })
  getActivity(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: activityQuerySchema }) query: ActivityQuery,
  ) {
    return this.progress.getActivity(req.auth.user.id, query.weeks);
  }

  @Get()
  @ApiResponse({ status: 200, standardSchema: progressResponseSchema })
  getSummaries(@Req() req: AuthenticatedRequest) {
    return this.progress.getSummaries(req.auth.user.id);
  }
}