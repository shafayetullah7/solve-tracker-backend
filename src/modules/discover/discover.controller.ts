import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import {
  DiscoverReadRateLimitGuard,
  DiscoverSearchRateLimitGuard,
} from './discover-bucket-rate-limit.guard.js';
import { DiscoverFullModeGuard } from './discover-full-mode.guard.js';
import { DiscoverService } from './discover.service.js';
import { TopicDiscoverService } from './topic-discover.service.js';
import { CompareService } from './compare.service.js';
import { DiscoverSafetyService } from '../discover-safety/discover-safety.service.js';
import {
  discoverReportBodySchema,
  type DiscoverReportBody,
} from '../discover-safety/schemas/discover-safety.schema.js';
import {
  benchmarkResponseSchema,
  compareQuerySchema,
  compareResponseSchema,
  type CompareQuery,
} from './schemas/compare.schema.js';
import {
  discoverEventsBodySchema,
  discoverEventsResponseSchema,
  errorSchema,
  forYouResponseSchema,
  hubListsQuerySchema,
  hubListsResponseSchema,
  hubProblemsQuerySchema,
  hubProblemsResponseSchema,
  peopleListQuerySchema,
  peopleListResponseSchema,
  problemCommunityResponseSchema,
  searchQuerySchema,
  searchResponseSchema,
  topicHintsResponseSchema,
  topicHubResponseSchema,
  topicsDirectoryResponseSchema,
  type DiscoverEventsBody,
  type HubListsQuery,
  type HubProblemsQuery,
  type PeopleListQuery,
  type SearchQuery,
} from './schemas/discover.schema.js';

@ApiTags('Discover')
@ApiResponse({ status: '4XX', standardSchema: errorSchema })
@UseGuards(AuthSecurityGuard, AccessGuard, DiscoverFullModeGuard)
@Controller('discover')
export class DiscoverController {
  constructor(
    private readonly discover: DiscoverService,
    private readonly topics: TopicDiscoverService,
    private readonly compare: CompareService,
    private readonly safety: DiscoverSafetyService,
  ) {}

  @Get('search')
  @UseGuards(DiscoverSearchRateLimitGuard)
  @ApiResponse({ status: 200, standardSchema: searchResponseSchema })
  search(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: searchQuerySchema }) query: SearchQuery,
  ) {
    return this.discover.search(req.auth.user.id, query);
  }

  @Get('for-you')
  @UseGuards(DiscoverReadRateLimitGuard)
  @ApiResponse({ status: 200, standardSchema: forYouResponseSchema })
  forYou(@Req() req: AuthenticatedRequest) {
    return this.discover.forYou(req.auth.user.id);
  }

  @Get('people')
  @UseGuards(DiscoverReadRateLimitGuard)
  @ApiResponse({ status: 200, standardSchema: peopleListResponseSchema })
  people(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: peopleListQuerySchema }) query: PeopleListQuery,
  ) {
    return this.discover.listPeople(req.auth.user.id, query);
  }

  @Post('events')
  @UseGuards(DiscoverReadRateLimitGuard)
  @ApiResponse({ status: 201, standardSchema: discoverEventsResponseSchema })
  events(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: discoverEventsBodySchema }) body: DiscoverEventsBody,
  ) {
    return this.discover.recordEvents(req.auth.user.id, body);
  }

  @Post('reports')
  @HttpCode(201)
  @UseGuards(DiscoverReadRateLimitGuard)
  @ApiResponse({ status: 201, description: 'Report accepted' })
  report(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: discoverReportBodySchema }) body: DiscoverReportBody,
  ) {
    return this.safety
      .report(req.auth.user.id, body.handle, body.reason)
      .then(() => ({}));
  }

  @Get('benchmark')
  @UseGuards(DiscoverReadRateLimitGuard)
  @ApiResponse({ status: 200, standardSchema: benchmarkResponseSchema })
  benchmark(@Req() req: AuthenticatedRequest) {
    return this.compare.benchmark(req.auth.user.id);
  }

  @Get('compare-peers')
  @UseGuards(DiscoverReadRateLimitGuard)
  @ApiResponse({ status: 200, standardSchema: compareResponseSchema })
  comparePeers(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: compareQuerySchema }) query: CompareQuery,
  ) {
    return this.compare.compareWithPeers(req.auth.user.id, query);
  }

  @Get('topics')
  @UseGuards(DiscoverReadRateLimitGuard)
  @ApiResponse({ status: 200, standardSchema: topicsDirectoryResponseSchema })
  topicsDirectory(@Req() req: AuthenticatedRequest) {
    return this.topics.topicsDirectory(req.auth.user.id);
  }

  @Get('topic-hints')
  @UseGuards(DiscoverReadRateLimitGuard)
  @ApiResponse({ status: 200, standardSchema: topicHintsResponseSchema })
  topicHints(@Req() req: AuthenticatedRequest) {
    return this.topics.topicHints(req.auth.user.id);
  }

  @Get('topics/:topicKey')
  @UseGuards(DiscoverReadRateLimitGuard)
  @ApiResponse({ status: 200, standardSchema: topicHubResponseSchema })
  topicHub(
    @Req() req: AuthenticatedRequest,
    @Param('topicKey') topicKey: string,
  ) {
    return this.topics.topicHub(req.auth.user.id, topicKey);
  }

  @Get('topics/:topicKey/lists')
  @UseGuards(DiscoverReadRateLimitGuard)
  @ApiResponse({ status: 200, standardSchema: hubListsResponseSchema })
  topicLists(
    @Req() req: AuthenticatedRequest,
    @Param('topicKey') topicKey: string,
    @Query({ schema: hubListsQuerySchema }) query: HubListsQuery,
  ) {
    return this.topics.hubLists(req.auth.user.id, topicKey, query);
  }

  @Get('topics/:topicKey/problems')
  @UseGuards(DiscoverReadRateLimitGuard)
  @ApiResponse({ status: 200, standardSchema: hubProblemsResponseSchema })
  topicProblems(
    @Req() req: AuthenticatedRequest,
    @Param('topicKey') topicKey: string,
    @Query({ schema: hubProblemsQuerySchema }) query: HubProblemsQuery,
  ) {
    return this.topics.hubProblems(req.auth.user.id, topicKey, query);
  }

  @Get('problems/:problemId/community')
  @UseGuards(DiscoverReadRateLimitGuard)
  @ApiResponse({ status: 200, standardSchema: problemCommunityResponseSchema })
  problemCommunity(
    @Req() req: AuthenticatedRequest,
    @Param('problemId') problemId: string,
  ) {
    return this.topics.problemCommunity(req.auth.user.id, problemId);
  }
}