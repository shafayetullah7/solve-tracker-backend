import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import { LearningGuidesService } from './learning-guides.service.js';
import { guideListResponseSchema, guideResponseSchema, learningErrorSchema, listGuidesQuerySchema, type ListGuidesQuery } from './schemas/learning-guides.schema.js';

@ApiTags('Learning')
@ApiResponse({ status: '4XX', standardSchema: learningErrorSchema })
@UseGuards(AuthSecurityGuard, AccessGuard)
@Controller('learning/guides')
export class LearningGuidesController {
  constructor(private readonly guides: LearningGuidesService) {}

  @Get()
  @ApiResponse({ status: 200, standardSchema: guideListResponseSchema })
  list(@Req() req: AuthenticatedRequest, @Query({ schema: listGuidesQuerySchema }) query: ListGuidesQuery) {
    return this.guides.list(req.auth.user.id, query);
  }

  @Get(':guideId')
  @ApiResponse({ status: 200, standardSchema: guideResponseSchema })
  get(@Req() req: AuthenticatedRequest, @Param('guideId') guideId: string) {
    return this.guides.get(req.auth.user.id, guideId);
  }
}
