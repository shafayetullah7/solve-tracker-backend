import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import { DiscoverModeGuard } from './discover-mode.guard.js';
import { DiscoverRateLimitGuard } from './discover-rate-limit.guard.js';
import { PeopleService } from './people.service.js';
import {
  activityQuerySchema,
  progressActivityResponseSchema,
  type ActivityQuery,
} from '../progress/schemas/activity.schema.js';
import {
  errorSchema,
  listPeopleProblemsQuerySchema,
  peopleProblemsListSchema,
  peopleTopicsResponseSchema,
  personHeaderResponseSchema,
  publicTopicHeaderSchema,
  type ListPeopleProblemsQuery,
} from './schemas/people.schema.js';
import { DiscoverFullModeGuard } from './discover-full-mode.guard.js';
import {
  similarQuerySchema,
  similarResponseSchema,
  type SimilarQuery,
} from './schemas/discover.schema.js';
import { CompareService } from './compare.service.js';
import {
  compareQuerySchema,
  compareResponseSchema,
  copyTopicResponseSchema,
  type CompareQuery,
} from './schemas/compare.schema.js';
import { PeopleCopyService } from './people-copy.service.js';
import { DiscoverCopyRateLimitGuard } from './discover-copy-rate-limit.guard.js';
import { FollowsService } from '../follows/follows.service.js';
import { DiscoverSafetyService } from '../discover-safety/discover-safety.service.js';

@ApiTags('People')
@ApiResponse({ status: '4XX', standardSchema: errorSchema })
@UseGuards(
  AuthSecurityGuard,
  AccessGuard,
  DiscoverModeGuard,
  DiscoverRateLimitGuard,
)
@Controller('people')
export class PeopleController {
  constructor(
    private readonly people: PeopleService,
    private readonly compare: CompareService,
    private readonly copy: PeopleCopyService,
    private readonly follows: FollowsService,
    private readonly safety: DiscoverSafetyService,
  ) {}

  @Put(':handle/block')
  @UseGuards(DiscoverFullModeGuard)
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'Blocked' })
  block(
    @Req() req: AuthenticatedRequest,
    @Param('handle') handle: string,
  ) {
    return this.safety.block(req.auth.user.id, handle);
  }

  @Delete(':handle/block')
  @UseGuards(DiscoverFullModeGuard)
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'Unblocked' })
  unblock(
    @Req() req: AuthenticatedRequest,
    @Param('handle') handle: string,
  ) {
    return this.safety.unblock(req.auth.user.id, handle);
  }

  @Put(':handle/follow')
  @UseGuards(DiscoverFullModeGuard)
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'Followed' })
  follow(
    @Req() req: AuthenticatedRequest,
    @Param('handle') handle: string,
  ) {
    return this.follows.follow(req.auth.user.id, handle);
  }

  @Delete(':handle/follow')
  @UseGuards(DiscoverFullModeGuard)
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'Unfollowed' })
  unfollow(
    @Req() req: AuthenticatedRequest,
    @Param('handle') handle: string,
  ) {
    return this.follows.unfollow(req.auth.user.id, handle);
  }

  @Get(':handle')
  @ApiResponse({ status: 200, standardSchema: personHeaderResponseSchema })
  getProfile(
    @Req() req: AuthenticatedRequest,
    @Param('handle') handle: string,
  ) {
    return this.people.getProfile(handle, req.auth.user.id);
  }

  @Get(':handle/activity')
  @ApiResponse({ status: 200, standardSchema: progressActivityResponseSchema })
  getActivity(
    @Param('handle') handle: string,
    @Query({ schema: activityQuerySchema }) query: ActivityQuery,
  ) {
    return this.people.getActivity(handle, query.weeks);
  }

  @Get(':handle/topics')
  @ApiResponse({ status: 200, standardSchema: peopleTopicsResponseSchema })
  getTopics(@Param('handle') handle: string) {
    return this.people.getTopics(handle);
  }

  @Get(':handle/topics/:topicId')
  @ApiResponse({ status: 200, standardSchema: publicTopicHeaderSchema })
  getPublicTopic(
    @Req() req: AuthenticatedRequest,
    @Param('handle') handle: string,
    @Param('topicId') topicId: string,
  ) {
    return this.people.getPublicTopic(handle, topicId, req.auth.user.id);
  }

  @Get(':handle/topics/:topicId/problems')
  @ApiResponse({ status: 200, standardSchema: peopleProblemsListSchema })
  listPublicProblems(
    @Req() req: AuthenticatedRequest,
    @Param('handle') handle: string,
    @Param('topicId') topicId: string,
    @Query({ schema: listPeopleProblemsQuerySchema }) query: ListPeopleProblemsQuery,
  ) {
    return this.people.getPublicTopicProblems(
      handle,
      topicId,
      req.auth.user.id,
      query,
    );
  }

  @Get(':handle/compare')
  @UseGuards(DiscoverFullModeGuard)
  @ApiResponse({ status: 200, standardSchema: compareResponseSchema })
  getCompare(
    @Req() req: AuthenticatedRequest,
    @Param('handle') handle: string,
    @Query({ schema: compareQuerySchema }) query: CompareQuery,
  ) {
    return this.compare.compareWithPerson(handle, req.auth.user.id, query);
  }

  @Post(':handle/topics/:topicId/copy')
  @UseGuards(DiscoverFullModeGuard, DiscoverCopyRateLimitGuard)
  @ApiResponse({ status: 201, standardSchema: copyTopicResponseSchema })
  copyTopic(
    @Req() req: AuthenticatedRequest,
    @Param('handle') handle: string,
    @Param('topicId') topicId: string,
  ) {
    return this.copy.copyPublicTopic(handle, topicId, req.auth.user.id);
  }

  @Get(':handle/similar')
  @UseGuards(DiscoverFullModeGuard)
  @ApiResponse({ status: 200, standardSchema: similarResponseSchema })
  similar(
    @Req() req: AuthenticatedRequest,
    @Param('handle') handle: string,
    @Query({ schema: similarQuerySchema }) query: SimilarQuery,
  ) {
    return this.people.getSimilar(handle, req.auth.user.id, query);
  }
}