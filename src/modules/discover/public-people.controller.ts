import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { DiscoverFullModeGuard } from './discover-full-mode.guard.js';
import { DiscoverPublicRateLimitGuard } from './discover-public-rate-limit.guard.js';
import { PeopleService } from './people.service.js';
import {
  anonymousPeopleProblemsListSchema,
  errorSchema,
  publicActivityQuerySchema,
  publicActivityResponseSchema,
  publicListPeopleProblemsQuerySchema,
  publicPeopleTopicsResponseSchema,
  publicPersonHeaderResponseSchema,
  publicPublicTopicHeaderSchema,
  type PublicActivityQuery,
} from './schemas/public-people.schema.js';
import type { ListPeopleProblemsQuery } from './schemas/people.schema.js';

@ApiTags('Public')
@ApiResponse({ status: '4XX', standardSchema: errorSchema })
@UseGuards(DiscoverFullModeGuard, DiscoverPublicRateLimitGuard)
@Controller('public/people')
export class PublicPeopleController {
  constructor(private readonly people: PeopleService) {}

  @Get(':handle')
  @ApiResponse({ status: 200, standardSchema: publicPersonHeaderResponseSchema })
  getProfile(@Param('handle') handle: string) {
    return this.people.getPublicProfile(handle);
  }

  @Get(':handle/activity')
  @ApiResponse({ status: 200, standardSchema: publicActivityResponseSchema })
  getActivity(
    @Param('handle') handle: string,
    @Query({ schema: publicActivityQuerySchema }) query: PublicActivityQuery,
  ) {
    return this.people.getPublicActivity(handle, query.weeks);
  }

  @Get(':handle/topics')
  @ApiResponse({ status: 200, standardSchema: publicPeopleTopicsResponseSchema })
  getTopics(@Param('handle') handle: string) {
    return this.people.getPublicTopics(handle);
  }

  @Get(':handle/topics/:topicId')
  @ApiResponse({ status: 200, standardSchema: publicPublicTopicHeaderSchema })
  getPublicTopic(
    @Param('handle') handle: string,
    @Param('topicId') topicId: string,
  ) {
    return this.people.getPublicTopicHeader(handle, topicId);
  }

  @Get(':handle/topics/:topicId/problems')
  @ApiResponse({ status: 200, standardSchema: anonymousPeopleProblemsListSchema })
  listPublicProblems(
    @Param('handle') handle: string,
    @Param('topicId') topicId: string,
    @Query({ schema: publicListPeopleProblemsQuerySchema })
    query: ListPeopleProblemsQuery,
  ) {
    return this.people.getPublicWebTopicProblems(handle, topicId, query);
  }
}