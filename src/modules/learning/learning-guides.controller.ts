import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import { LearningGuidesService } from './learning-guides.service.js';
import { guideListResponseSchema, guideResponseSchema, learningErrorSchema, listGuidesQuerySchema, type ListGuidesQuery, createGuideSchema, patchGuideSchema, guideLifecycleSchema, guideMutationReceiptSchema, type CreateGuideInput, type PatchGuideInput, type GuideLifecycleInput } from './schemas/learning-guides.schema.js';

import { createNodeSchema, moveNodeSchema, patchNodeSchema, treeResponseSchema, type CreateNodeInput, type MoveNodeInput, type PatchNodeInput } from './schemas/learning-nodes.schema.js';

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

  @Get(':guideId/tree')
  @ApiResponse({ status: 200, standardSchema: treeResponseSchema })
  tree(@Req() req: AuthenticatedRequest, @Param('guideId') id: string) {
    return this.guides.tree(req.auth.user.id, id);
  }

  @Post(':guideId/nodes')
  @ApiResponse({ status: 201, standardSchema: guideMutationReceiptSchema })
  createNode(@Req() req: AuthenticatedRequest, @Param('guideId') id: string, @Body({ schema: createNodeSchema }) body: CreateNodeInput) {
    return this.guides.createNode(req.auth.user.id, id, body);
  }

  @Delete(':guideId/nodes/:nodeId')
  @HttpCode(204)
  @ApiHeader({ name: 'X-Expected-Revision', required: true })
  @ApiHeader({ name: 'X-Operation-Id', required: true })
  @ApiResponse({ status: 204, description: 'Subtree soft deleted' })
  async deleteNode(@Req() req: AuthenticatedRequest, @Param('guideId') guideId: string, @Param('nodeId') nodeId: string,
    @Headers('x-expected-revision') revision: string | undefined,
    @Headers('x-operation-id') operation: string | undefined) {
    await this.guides.deleteNode(req.auth.user.id, guideId, nodeId, revision, operation);
  }

  @Patch(':guideId/nodes/:nodeId')
  @ApiResponse({ status: 200, standardSchema: guideMutationReceiptSchema })
  patchNode(@Req() req: AuthenticatedRequest, @Param('guideId') guideId: string, @Param('nodeId') nodeId: string, @Body({ schema: patchNodeSchema }) body: PatchNodeInput) {
    return this.guides.patchNode(req.auth.user.id, guideId, nodeId, body);
  }

  @Patch(':guideId/nodes/:nodeId/placement')
  @ApiResponse({ status: 200, standardSchema: guideMutationReceiptSchema })
  moveNode(@Req() req: AuthenticatedRequest, @Param('guideId') guideId: string, @Param('nodeId') nodeId: string, @Body({ schema: moveNodeSchema }) body: MoveNodeInput) {
    return this.guides.moveNode(req.auth.user.id, guideId, nodeId, body);
  }

  @Post()
  @ApiResponse({ status: 201, standardSchema: guideMutationReceiptSchema })
  create(@Req() req: AuthenticatedRequest, @Body({ schema: createGuideSchema }) body: CreateGuideInput) {
    return this.guides.create(req.auth.user.id, body);
  }

  @Patch(':guideId')
  @ApiResponse({ status: 200, standardSchema: guideMutationReceiptSchema })
  patch(@Req() req: AuthenticatedRequest, @Param('guideId') id: string, @Body({ schema: patchGuideSchema }) body: PatchGuideInput) {
    return this.guides.patch(req.auth.user.id, id, body);
  }

  @Patch(':guideId/lifecycle')
  @ApiResponse({ status: 200, standardSchema: guideMutationReceiptSchema })
  lifecycle(@Req() req: AuthenticatedRequest, @Param('guideId') id: string, @Body({ schema: guideLifecycleSchema }) body: GuideLifecycleInput) {
    return this.guides.lifecycle(req.auth.user.id, id, body);
  }

  @Delete(':guideId')
  @HttpCode(204)
  @ApiHeader({ name: 'X-Expected-Revision', required: true })
  @ApiHeader({ name: 'X-Operation-Id', required: true })
  @ApiResponse({ status: 204, description: 'Guide soft deleted' })
  async remove(@Req() req: AuthenticatedRequest, @Param('guideId') id: string,
    @Headers('x-expected-revision') revision: string | undefined,
    @Headers('x-operation-id') operation: string | undefined) {
    await this.guides.remove(req.auth.user.id, id, revision, operation);
  }
}
