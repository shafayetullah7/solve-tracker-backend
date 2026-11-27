import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import { learningErrorSchema } from '../learning/schemas/learning-guides.schema.js';
import { AssessmentsService } from './assessments.service.js';
import { addQuestionSchema } from './schemas/assessment-question.schema.js';
import {
  addQuestionOperationSchema,
  assessmentListSchema,
  assessmentResponseSchema,
  createAssessmentSchema,
  patchAssessmentSchema,
  publishAssessmentSchema,
  type CreateAssessmentInput,
  type PatchAssessmentInput,
  type PublishAssessmentInput,
} from './schemas/assessment.schema.js';
import type { AddQuestionInput } from './schemas/assessment-question.schema.js';
import { z } from 'zod';

const addQuestionBodySchema = addQuestionSchema.and(addQuestionOperationSchema);

@ApiTags('Learning assessments (author)')
@ApiResponse({ status: '4XX', standardSchema: learningErrorSchema })
@UseGuards(AuthSecurityGuard, AccessGuard)
@Controller('learning/guides/:guideId/assessments')
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  @Get()
  @ApiResponse({ status: 200, standardSchema: assessmentListSchema })
  list(@Req() req: AuthenticatedRequest, @Param('guideId') guideId: string) {
    return this.assessments.list(req.auth.user.id, guideId);
  }

  @Post()
  @ApiResponse({ status: 201, standardSchema: assessmentResponseSchema })
  create(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') guideId: string,
    @Body({ schema: createAssessmentSchema }) body: CreateAssessmentInput,
  ) {
    return this.assessments.create(req.auth.user.id, guideId, body);
  }

  @Get(':assessmentId/draft')
  @ApiResponse({ status: 200, standardSchema: assessmentResponseSchema })
  getDraft(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') guideId: string,
    @Param('assessmentId') assessmentId: string,
  ) {
    return this.assessments.getDraft(req.auth.user.id, guideId, assessmentId);
  }

  @Get(':assessmentId')
  @ApiResponse({ status: 200, standardSchema: assessmentResponseSchema })
  get(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') guideId: string,
    @Param('assessmentId') assessmentId: string,
  ) {
    return this.assessments.get(req.auth.user.id, guideId, assessmentId);
  }

  @Patch(':assessmentId')
  @ApiResponse({ status: 200, standardSchema: assessmentResponseSchema })
  patch(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') guideId: string,
    @Param('assessmentId') assessmentId: string,
    @Body({ schema: patchAssessmentSchema }) body: PatchAssessmentInput,
  ) {
    return this.assessments.patch(req.auth.user.id, guideId, assessmentId, body);
  }

  @Post(':assessmentId/questions')
  @ApiResponse({ status: 201, standardSchema: assessmentResponseSchema })
  addQuestion(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') guideId: string,
    @Param('assessmentId') assessmentId: string,
    @Body({ schema: addQuestionBodySchema }) body: AddQuestionInput & z.infer<typeof addQuestionOperationSchema>,
  ) {
    const { operationId, ...question } = body;
    return this.assessments.addQuestion(
      req.auth.user.id,
      guideId,
      assessmentId,
      question as AddQuestionInput,
      operationId,
    );
  }

  @Post(':assessmentId/revisions')
  @ApiResponse({ status: 201, standardSchema: assessmentResponseSchema })
  publishRevision(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') guideId: string,
    @Param('assessmentId') assessmentId: string,
    @Body({ schema: publishAssessmentSchema }) body: PublishAssessmentInput,
  ) {
    return this.assessments.publish(req.auth.user.id, guideId, assessmentId, body);
  }

  @Post(':assessmentId/publish')
  @ApiResponse({ status: 201, standardSchema: assessmentResponseSchema })
  publish(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') guideId: string,
    @Param('assessmentId') assessmentId: string,
    @Body({ schema: publishAssessmentSchema }) body: PublishAssessmentInput,
  ) {
    return this.assessments.publish(req.auth.user.id, guideId, assessmentId, body);
  }
}