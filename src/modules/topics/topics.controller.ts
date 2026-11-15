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
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import { TopicsService } from './topics.service.js';
import {
  createTopicSchema,
  renameTopicSchema,
  listTopicsQuerySchema,
  topicResponseSchema,
  topicListResponseSchema,
  errorSchema,
  type CreateTopicInput,
  type RenameTopicInput,
  type ListTopicsQuery,
} from './schemas/topics.schema.js';

@ApiTags('Topics')
@ApiResponse({ status: '4XX', standardSchema: errorSchema })
@UseGuards(AuthSecurityGuard, AccessGuard)
@Controller('topics')
export class TopicsController {
  constructor(private readonly topics: TopicsService) {}

  @Get()
  @ApiResponse({ status: 200, standardSchema: topicListResponseSchema })
  list(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: listTopicsQuerySchema }) query: ListTopicsQuery,
  ) {
    return this.topics.getList(req.auth.user.id, query);
  }

  @Post()
  @ApiResponse({ status: 201, standardSchema: topicResponseSchema })
  create(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: createTopicSchema }) body: CreateTopicInput,
  ) {
    return this.topics.create(req.auth.user.id, body.name);
  }

  @Patch(':topicId')
  @ApiResponse({ status: 200, standardSchema: topicResponseSchema })
  rename(
    @Req() req: AuthenticatedRequest,
    @Param('topicId') topicId: string,
    @Body({ schema: renameTopicSchema }) body: RenameTopicInput,
  ) {
    return this.topics.rename(req.auth.user.id, topicId, body.name);
  }

  @Delete(':topicId')
  @HttpCode(204)
  @ApiResponse({
    status: 204,
    description: 'Topic deleted',
  })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('topicId') topicId: string,
  ) {
    await this.topics.remove(req.auth.user.id, topicId);
  }
}