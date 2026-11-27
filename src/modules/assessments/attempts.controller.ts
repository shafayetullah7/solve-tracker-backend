import { Body, Controller, Get, Param, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import { learningErrorSchema } from '../learning/schemas/learning-guides.schema.js';
import { AttemptsService } from './attempts.service.js';
import { attemptResponseSchema, saveAnswerSchema, submitAttemptSchema } from './schemas/attempt.schema.js';
import type { SaveAnswerInput, SubmitAttemptInput } from './schemas/attempt.schema.js';

@ApiTags('Learning assessments (attempts)')
@ApiResponse({ status: '4XX', standardSchema: learningErrorSchema })
@UseGuards(AuthSecurityGuard, AccessGuard)
@Controller('learning/guides/:guideId/assessments')
export class AttemptsController {
  constructor(private readonly attempts: AttemptsService) {}

  @Post(':assessmentId/attempts')
  @ApiResponse({ status: 200, standardSchema: attemptResponseSchema })
  @ApiResponse({ status: 201, standardSchema: attemptResponseSchema })
  async startAttempt(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') guideId: string,
    @Param('assessmentId') assessmentId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.attempts.start(req.auth.user.id, guideId, assessmentId);
    res.status(result.resumed ? 200 : 201);
    return result.body;
  }

  @Get(':assessmentId/attempts/:attemptId')
  @ApiResponse({ status: 200, standardSchema: attemptResponseSchema })
  getAttempt(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') guideId: string,
    @Param('assessmentId') assessmentId: string,
    @Param('attemptId') attemptId: string,
  ) {
    return this.attempts.get(req.auth.user.id, guideId, assessmentId, attemptId);
  }

  @Patch(':assessmentId/attempts/:attemptId/answers')
  @ApiResponse({ status: 200, standardSchema: attemptResponseSchema })
  saveAnswer(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') guideId: string,
    @Param('assessmentId') assessmentId: string,
    @Param('attemptId') attemptId: string,
    @Body({ schema: saveAnswerSchema }) body: SaveAnswerInput,
  ) {
    return this.attempts.saveAnswer(req.auth.user.id, guideId, assessmentId, attemptId, body);
  }

  @Post(':assessmentId/attempts/:attemptId/submit')
  @ApiResponse({ status: 201, standardSchema: attemptResponseSchema })
  submitAttempt(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') guideId: string,
    @Param('assessmentId') assessmentId: string,
    @Param('attemptId') attemptId: string,
    @Body({ schema: submitAttemptSchema }) body: SubmitAttemptInput,
  ) {
    return this.attempts.submit(req.auth.user.id, guideId, assessmentId, attemptId, body);
  }

  @Post(':assessmentId/attempts/:attemptId/submissions')
  @ApiResponse({ status: 201, standardSchema: attemptResponseSchema })
  submitAttemptViaSubmissionsAlias(
    @Req() req: AuthenticatedRequest,
    @Param('guideId') guideId: string,
    @Param('assessmentId') assessmentId: string,
    @Param('attemptId') attemptId: string,
    @Body({ schema: submitAttemptSchema }) body: SubmitAttemptInput,
  ) {
    return this.attempts.submit(req.auth.user.id, guideId, assessmentId, attemptId, body);
  }
}