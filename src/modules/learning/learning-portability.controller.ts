import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import { LearningPortabilityService } from './learning-portability.service.js';
import { guideMutationReceiptSchema } from './schemas/learning-guides.schema.js';
import { importCommitSchema, importPreviewSchema } from './schemas/learning-portable.schema.js';
import { learningErrorSchema } from './schemas/learning-guides.schema.js';
import { z } from 'zod';

const importPreviewResponseSchema = z.strictObject({
  importId: z.uuid(),
  guidePreview: z.strictObject({
    title: z.string(),
    nodeCount: z.number().int().nonnegative(),
    nodes: z.array(z.strictObject({
      localKey: z.string(),
      parentLocalKey: z.string().nullable(),
      title: z.string(),
    })),
  }),
  warnings: z.array(z.string()),
  expiresAt: z.string(),
});

@ApiTags('Learning')
@ApiResponse({ status: '4XX', standardSchema: learningErrorSchema })
@UseGuards(AuthSecurityGuard, AccessGuard)
@Controller('learning/imports')
export class LearningPortabilityController {
  constructor(private readonly portability: LearningPortabilityService) {}

  @Post('preview')
  @ApiResponse({ status: 201, standardSchema: importPreviewResponseSchema })
  preview(@Req() req: AuthenticatedRequest, @Body({ schema: importPreviewSchema }) body: z.infer<typeof importPreviewSchema>) {
    return this.portability.previewImport(req.auth.user.id, body);
  }

  @Post(':importId/commit')
  @ApiResponse({ status: 200, standardSchema: guideMutationReceiptSchema })
  commit(
    @Req() req: AuthenticatedRequest,
    @Param('importId') importId: string,
    @Body({ schema: importCommitSchema }) body: z.infer<typeof importCommitSchema>,
  ) {
    return this.portability.commitImport(req.auth.user.id, importId, body);
  }
}