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
import { ProblemsService } from './problems.service.js';
import {
  createProblemSchema,
  updateProblemSchema,
  listProblemsQuerySchema,
  problemResponseSchema,
  problemListResponseSchema,
  errorSchema,
  type CreateProblemInput,
  type UpdateProblemInput,
  type ListProblemsQuery,
} from './schemas/problems.schema.js';

@ApiTags('Problems')
@ApiResponse({ status: '4XX', standardSchema: errorSchema })
@UseGuards(AuthSecurityGuard, AccessGuard)
@Controller('problems')
export class ProblemsController {
  constructor(private readonly problems: ProblemsService) {}

  @Get()
  @ApiResponse({ status: 200, standardSchema: problemListResponseSchema })
  list(
    @Req() req: AuthenticatedRequest,
    @Query({ schema: listProblemsQuerySchema }) query: ListProblemsQuery,
  ) {
    return this.problems.getList(req.auth.user.id, query);
  }

  @Post()
  @ApiResponse({ status: 201, standardSchema: problemResponseSchema })
  create(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: createProblemSchema }) body: CreateProblemInput,
  ) {
    return this.problems.create(req.auth.user.id, body);
  }

  @Get(':problemId')
  @ApiResponse({ status: 200, standardSchema: problemResponseSchema })
  getOne(
    @Req() req: AuthenticatedRequest,
    @Param('problemId') problemId: string,
  ) {
    return this.problems.getOne(req.auth.user.id, problemId);
  }

  @Patch(':problemId')
  @ApiResponse({ status: 200, standardSchema: problemResponseSchema })
  update(
    @Req() req: AuthenticatedRequest,
    @Param('problemId') problemId: string,
    @Body({ schema: updateProblemSchema }) body: UpdateProblemInput,
  ) {
    return this.problems.update(req.auth.user.id, problemId, body);
  }

  @Delete(':problemId')
  @HttpCode(204)
  @ApiResponse({
    status: 204,
    description: 'Problem deleted',
  })
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('problemId') problemId: string,
  ) {
    await this.problems.remove(req.auth.user.id, problemId);
  }
}