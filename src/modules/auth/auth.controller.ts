import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { AuthCookies } from './auth.cookies.js';
import { AuthSecurityGuard, AuthLimiter } from './auth-security.guard.js';
import { AccessGuard } from './access.guard.js';
import type { AuthenticatedRequest } from './access.guard.js';
import {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  changePasswordSchema,
  userResponseSchema,
  messageSchema,
  errorSchema,
} from './schemas/auth.schema.js';
import type {
  RegisterInput,
  LoginInput,
  ResetInput,
  ChangePasswordInput,
} from './schemas/auth.schema.js';
@ApiTags('Authentication')
@ApiResponse({ status: '4XX', standardSchema: errorSchema })
@UseGuards(AuthSecurityGuard)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cookies: AuthCookies,
    private readonly limiter: AuthLimiter,
  ) {}
  @Post('register')
  @ApiResponse({ status: 201, standardSchema: userResponseSchema })
  register(@Body({ schema: registerSchema }) input: RegisterInput) {
    return this.auth.register(input);
  }
  @Post('login')
  @HttpCode(200)
  @ApiResponse({ status: 200, standardSchema: userResponseSchema })
  async login(
    @Body({ schema: loginSchema }) input: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.auth.login(
        input,
        this.cookies.read(req, 'refresh'),
      );
      this.cookies.set(res, result.tokens);
      return { user: result.user };
    } catch (error) {
      if (
        error instanceof Error &&
        'getStatus' in error &&
        typeof error.getStatus === 'function' &&
        error.getStatus() === 401
      )
        this.limiter.failedLogin(input.email);
      throw error;
    }
  }
  @Get('session')
  @UseGuards(AccessGuard)
  @ApiResponse({ status: 200, standardSchema: userResponseSchema })
  session(@Req() req: AuthenticatedRequest) {
    return { user: req.auth.user };
  }
  @Post('refresh')
  @HttpCode(200)
  @ApiResponse({ status: 200, standardSchema: userResponseSchema })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.auth.refresh(this.cookies.read(req, 'refresh'));
      this.cookies.set(res, result.tokens);
      return { user: result.user };
    } catch (error) {
      if (
        error instanceof Error &&
        'getStatus' in error &&
        typeof error.getStatus === 'function' &&
        error.getStatus() === 401
      )
        this.cookies.clear(res);
      throw error;
    }
  }
  @Post('logout')
  @HttpCode(204)
  @ApiResponse({ status: 204, description: 'Session revoked; cookies cleared' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(
      this.cookies.read(req, 'access'),
      this.cookies.read(req, 'refresh'),
    );
    this.cookies.clear(res);
  }
  @Post('forgot-password')
  @HttpCode(202)
  @ApiResponse({ status: 202, standardSchema: messageSchema })
  forgot(@Body({ schema: forgotSchema }) input: { email: string }) {
    return this.auth.forgot(input.email);
  }
  @Post('reset-password')
  @HttpCode(204)
  @ApiResponse({
    status: 204,
    description: 'Password reset; all sessions revoked',
  })
  async reset(
    @Body({ schema: resetSchema }) input: ResetInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.reset(input);
    this.cookies.clear(res);
  }
  @Post('change-password')
  @HttpCode(204)
  @UseGuards(AccessGuard)
  @ApiResponse({
    status: 204,
    description: 'Password changed; all sessions revoked',
  })
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: changePasswordSchema }) input: ChangePasswordInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.changePassword(req.auth.user.id, input);
    this.cookies.clear(res);
  }
}
