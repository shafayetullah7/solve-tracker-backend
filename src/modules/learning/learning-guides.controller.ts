import { Body, Controller, Delete, Get, Headers, HttpCode, Param, Patch, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiHeader, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import { LearningGuidesService } from './learning-guides.service.js';
import { learningImportSourceKind } from '../../database/schema/learning/learning-import-source-kind.enum.js';
import { LearningPortabilityService } from './learning-portability.service.js';
import { guideExportQuerySchema } from './schemas/learning-portable.schema.js';
import { z } from 'zod';
import { guideListResponseSchema, guideResponseSchema, learningErrorSchema, listGuidesQuerySchema, type ListGuidesQuery, createGuideSchema, patchGuideSchema, guideLifecycleSchema, guideMutationReceiptSchema, type CreateGuideInput, type PatchGuideInput, type GuideLifecycleInput } from './schemas/learning-guides.schema.js';

import { enrollmentResponseSchema, resumeSchema, type ResumeInput, recoveryQuerySchema, recoveryResponseSchema, type RecoveryQuery, createNodeSchema, moveNodeSchema, patchNodeSchema, treeResponseSchema, type CreateNodeInput, type MoveNodeInput, type PatchNodeInput } from './schemas/learning-nodes.schema.js';
import {
  nodeCompletionSchema,
  nodeContentResponseSchema,
  replaceNodeContentSchema,
  type NodeCompletionInput,
  type ReplaceNodeContentInput,
} from './schemas/learning-blocks.schema.js';

const guideCopySchema = z.strictObject({ operationId: z.uuid() });

@ApiTags('Learning')
@ApiResponse({ status: '4XX', standardSchema: learningErrorSchema })
@UseGuards(AuthSecurityGuard, AccessGuard)
@Controller('learning/guides')
export class LearningGuidesController {
  constructor(
    private readonly guides: LearningGuidesService,
    private readonly portability: LearningPortabilityService,
  ) {}

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

  @Get(':guideId/enrollment')
  @ApiResponse({ status: 200, standardSchema: enrollmentResponseSchema })
  enrollment(@Req() req: AuthenticatedRequest, @Param('guideId') id: string) {
    return this.guides.enrollment(req.auth.user.id, id);
  }

  @Patch(':guideId/enrollment/resume')
  @ApiResponse({ status: 200, standardSchema: guideMutationReceiptSchema })
  resume(@Req() req: AuthenticatedRequest, @Param('guideId') id: string, @Body({ schema: resumeSchema }) body: ResumeInput) {
    return this.guides.resume(req.auth.user.id, id, body);
  }

  @Get(':guideId/recovery')
  @ApiResponse({ status: 200, standardSchema: recoveryResponseSchema })
  recoverable(@Req() req: AuthenticatedRequest, @Param('guideId') id: string, @Query({ schema: recoveryQuerySchema }) query: RecoveryQuery) {
    return this.guides.recoverable(req.auth.user.id, id, query);
  }

  @Get(':guideId/tree')
  @ApiResponse({ status: 200, standardSchema: treeResponseSchema })
  tree(@Req() req: AuthenticatedRequest, @Param('guideId') id: string) {
    return this.guides.tree(req.auth.user.id, id);
  }

  @Get(':guideId/export')
  async exportGuide(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') id: string,
    @Query({ schema: guideExportQuerySchema }) query: z.infer<typeof guideExportQuerySchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const exported = await this.portability.exportGuide(req.auth.user.id, id, query.format);
    if (exported.format === learningImportSourceKind.Markdown) {
      res.type('text/markdown; charset=utf-8');
      return exported.body;
    }
    return exported.body;
  }

  @Post(':guideId/copies')
  @ApiResponse({ status: 201, standardSchema: guideMutationReceiptSchema })
  copyGuide(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') id: string,
    @Body({ schema: guideCopySchema }) body: z.infer<typeof guideCopySchema>,
  ) {
    return this.portability.copyGuide(req.auth.user.id, id, body.operationId);
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

  @Post(':guideId/nodes/:nodeId/copy')
  @ApiResponse({ status: 201, standardSchema: guideMutationReceiptSchema })
  copyNode(@Req() req: AuthenticatedRequest, @Param('guideId') guideId: string, @Param('nodeId') nodeId: string, @Body({ schema: moveNodeSchema }) body: MoveNodeInput) {
    return this.guides.copyNode(req.auth.user.id, guideId, nodeId, body);
  }

  @Post(':guideId/nodes/:nodeId/restore')
  @HttpCode(200)
  @ApiResponse({ status: 200, standardSchema: guideMutationReceiptSchema })
  restoreNode(@Req() req: AuthenticatedRequest, @Param('guideId') guideId: string, @Param('nodeId') nodeId: string, @Body({ schema: moveNodeSchema }) body: MoveNodeInput) {
    return this.guides.restoreNode(req.auth.user.id, guideId, nodeId, body);
  }

  @Patch(':guideId/nodes/:nodeId/placement')
  @ApiResponse({ status: 200, standardSchema: guideMutationReceiptSchema })
  moveNode(@Req() req: AuthenticatedRequest, @Param('guideId') guideId: string, @Param('nodeId') nodeId: string, @Body({ schema: moveNodeSchema }) body: MoveNodeInput) {
    return this.guides.moveNode(req.auth.user.id, guideId, nodeId, body);
  }

  @Get(':guideId/nodes/:nodeId/content')
  @ApiResponse({ status: 200, standardSchema: nodeContentResponseSchema })
  nodeContent(@Req() req: AuthenticatedRequest, @Param('guideId') guideId: string, @Param('nodeId') nodeId: string) {
    return this.guides.nodeContent(req.auth.user.id, guideId, nodeId);
  }

  @Put(':guideId/nodes/:nodeId/content')
  @ApiResponse({ status: 200, standardSchema: guideMutationReceiptSchema })
  replaceNodeContent(@Req() req: AuthenticatedRequest, @Param('guideId') guideId: string, @Param('nodeId') nodeId: string, @Body({ schema: replaceNodeContentSchema }) body: ReplaceNodeContentInput) {
    return this.guides.replaceNodeContent(req.auth.user.id, guideId, nodeId, body);
  }

  @Patch(':guideId/nodes/:nodeId/completion')
  @ApiResponse({ status: 200, standardSchema: guideMutationReceiptSchema })
  nodeCompletion(@Req() req: AuthenticatedRequest, @Param('guideId') guideId: string, @Param('nodeId') nodeId: string, @Body({ schema: nodeCompletionSchema }) body: NodeCompletionInput) {
    return this.guides.setNodeCompletion(req.auth.user.id, guideId, nodeId, body);
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
