import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthCookies } from '../auth/auth.cookies.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import { AuthService } from '../auth/auth.service.js';
import { ProfileService } from './profile.service.js';
import { DiscoverCountersService } from '../discover/discover-counters.service.js';
import {
  shareStatsQuerySchema,
  shareStatsResponseSchema,
  type ShareStatsQuery,
} from './schemas/share-stats.schema.js';
import {
  createEducationEntrySchema,
  createWorkEntrySchema,
  deleteAccountSchema,
  educationEntryResponseSchema,
  errorSchema,
  patchProfileSchema,
  profileResponseSchema,
  updateEducationEntrySchema,
  updateWorkEntrySchema,
  workEntryResponseSchema,
  type CreateEducationEntryInput,
  type CreateWorkEntryInput,
  type DeleteAccountInput,
  type PatchProfileInput,
  type UpdateEducationEntryInput,
  type UpdateWorkEntryInput,
} from './schemas/profile.schema.js';
import { DiscoverModeGuard } from '../discover/discover-mode.guard.js';
import { DiscoverFullModeGuard } from '../discover/discover-full-mode.guard.js';
import { FollowsService } from '../follows/follows.service.js';
import {
  followersCountResponseSchema,
  followingListQuerySchema,
  followingListResponseSchema,
  type FollowingListQuery,
} from '../follows/schemas/follows.schema.js';

@ApiTags('Profile')
@ApiResponse({ status: '4XX', standardSchema: errorSchema })
@UseGuards(AuthSecurityGuard, AccessGuard)
@Controller('users/me')
export class ProfileController {
  constructor(
    private readonly profile: ProfileService,
    private readonly discoverCounters: DiscoverCountersService,
    private readonly follows: FollowsService,
    private readonly auth: AuthService,
    private readonly cookies: AuthCookies,
  ) {}

  @Get('following')
  @UseGuards(DiscoverModeGuard, DiscoverFullModeGuard)
  @ApiResponse({ status: 200, standardSchema: followingListResponseSchema })
  listFollowing(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: followingListQuerySchema }) query: FollowingListQuery,
  ) {
    return this.follows.listFollowing(req.auth.user.id, query);
  }

  @Get('followers/count')
  @UseGuards(DiscoverModeGuard, DiscoverFullModeGuard)
  @ApiResponse({ status: 200, standardSchema: followersCountResponseSchema })
  followersCount(@Req() req: AuthenticatedRequest) {
    return this.follows.followersCount(req.auth.user.id);
  }

  @Get('share-stats')
  @ApiResponse({ status: 200, standardSchema: shareStatsResponseSchema })
  shareStats(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: shareStatsQuerySchema }) query: ShareStatsQuery,
  ) {
  return this.discoverCounters.aggregateShareStats(req.auth.user.id, query.days);
  }

  @Get('profile')
  @ApiResponse({ status: 200, standardSchema: profileResponseSchema })
  get(@Req() req: AuthenticatedRequest) {
    return this.profile.getProfile(req.auth.user.id);
  }

  @Patch('profile')
  @ApiResponse({ status: 200, standardSchema: profileResponseSchema })
  patch(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: patchProfileSchema }) input: PatchProfileInput,
  ) {
    return this.profile.patchProfile(req.auth.user.id, input);
  }

  @Post('work-entries')
  @HttpCode(201)
  @ApiResponse({ status: 201, standardSchema: workEntryResponseSchema })
  createWork(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: createWorkEntrySchema }) input: CreateWorkEntryInput,
  ) {
    return this.profile.createWork(req.auth.user.id, input);
  }

  @Patch('work-entries/:id')
  @ApiResponse({ status: 200, standardSchema: workEntryResponseSchema })
  updateWork(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body({ schema: updateWorkEntrySchema }) input: UpdateWorkEntryInput,
  ) {
    return this.profile.updateWork(req.auth.user.id, id, input);
  }

  @Delete('work-entries/:id')
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'Work entry deleted' })
  deleteWork(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.profile.deleteWork(req.auth.user.id, id);
  }

  @Post('education-entries')
  @HttpCode(201)
  @ApiResponse({ status: 201, standardSchema: educationEntryResponseSchema })
  createEducation(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: createEducationEntrySchema }) input: CreateEducationEntryInput,
  ) {
    return this.profile.createEducation(req.auth.user.id, input);
  }

  @Patch('education-entries/:id')
  @ApiResponse({ status: 200, standardSchema: educationEntryResponseSchema })
  updateEducation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body({ schema: updateEducationEntrySchema })
    input: UpdateEducationEntryInput,
  ) {
    return this.profile.updateEducation(req.auth.user.id, id, input);
  }

  @Delete('education-entries/:id')
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'Education entry deleted' })
  deleteEducation(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.profile.deleteEducation(req.auth.user.id, id);
  }

  @Delete()
  @HttpCode(204)
  @ApiResponse({
    status: 204,
    description: 'Account permanently deleted; all sessions revoked',
  })
  async eraseAccount(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: deleteAccountSchema }) input: DeleteAccountInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.eraseAccount(req.auth.user.id, input);
    this.cookies.clear(res);
  }
}