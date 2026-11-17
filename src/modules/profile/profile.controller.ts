import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AccessGuard, type AuthenticatedRequest } from '../auth/access.guard.js';
import { AuthSecurityGuard } from '../auth/auth-security.guard.js';
import { ProfileService } from './profile.service.js';
import {
  createEducationEntrySchema,
  createWorkEntrySchema,
  educationEntryResponseSchema,
  errorSchema,
  patchProfileSchema,
  profileResponseSchema,
  updateEducationEntrySchema,
  updateWorkEntrySchema,
  workEntryResponseSchema,
  type CreateEducationEntryInput,
  type CreateWorkEntryInput,
  type PatchProfileInput,
  type UpdateEducationEntryInput,
  type UpdateWorkEntryInput,
} from './schemas/profile.schema.js';

@ApiTags('Profile')
@ApiResponse({ status: '4XX', standardSchema: errorSchema })
@UseGuards(AuthSecurityGuard, AccessGuard)
@Controller('users/me')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

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
}