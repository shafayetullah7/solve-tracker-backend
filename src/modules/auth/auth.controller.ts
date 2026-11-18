import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { Environment } from '../../config/environment.js';
import { AuthService } from './auth.service.js';
import { AuthCookies } from './auth.cookies.js';
import { GoogleOAuthService } from './google/google-oauth.service.js';
import { OAuthStateService } from './google/oauth-state.service.js';
import {
  GoogleOAuthError,
  GoogleOAuthErrorCodes,
} from './google/google-oauth.errors.js';
import {
  frontendAppUrl,
  frontendLoginErrorUrl,
  frontendProfileUrl,
} from './google/oauth-redirect.js';
import { oauthReturnPath } from './google/oauth-return-path.js';
import { AuthSecurityGuard, AuthLimiter } from './auth-security.guard.js';
import { AccessGuard } from './access.guard.js';
import type { AuthenticatedRequest } from './access.guard.js';
import {
  registerSchema,
  loginSchema,
  forgotSchema,
  resetSchema,
  changePasswordSchema,
  setPasswordSchema,
  userResponseSchema,
  sessionResponseSchema,
  messageSchema,
  errorSchema,
} from './schemas/auth.schema.js';
import type {
  RegisterInput,
  LoginInput,
  ResetInput,
  ChangePasswordInput,
  SetPasswordInput,
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
    private readonly google: GoogleOAuthService,
    private readonly oauthState: OAuthStateService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  private frontendOrigin(): string {
    return this.config.getOrThrow('FRONTEND_ORIGIN', { infer: true });
  }

  private ensureGoogleEnabled(): void {
    if (!this.google.isEnabled()) throw new NotFoundException();
  }

  private redirectOAuthError(
    res: Response,
    code: string,
    target: 'login' | 'profile' = 'login',
  ): void {
    this.oauthState.clearCookie(res);
    const origin = this.frontendOrigin();
    const url =
      target === 'profile'
        ? frontendProfileUrl(origin, { oauthError: code })
        : frontendLoginErrorUrl(origin, code);
    res.redirect(302, url);
  }
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
  @ApiResponse({ status: 200, standardSchema: sessionResponseSchema })
  async session(@Req() req: AuthenticatedRequest) {
    const account = await this.auth.accountFlags(req.auth.user.id);
    return { user: req.auth.user, account };
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

  @Post('set-password')
  @HttpCode(204)
  @UseGuards(AccessGuard)
  @ApiResponse({
    status: 204,
    description:
      'Initial password set for Google-only account; current session retained (unlike change-password). Errors: PASSWORD_ALREADY_SET, VALIDATION_ERROR.',
  })
  async setPassword(
    @Req() req: AuthenticatedRequest,
    @Body({ schema: setPasswordSchema }) input: SetPasswordInput,
  ) {
    await this.auth.setPassword(req.auth.user.id, input);
  }

  @Delete('google/link')
  @HttpCode(204)
  @UseGuards(AccessGuard)
  @ApiExcludeEndpoint()
  async unlinkGoogle(@Req() req: AuthenticatedRequest) {
    await this.auth.unlinkGoogle(req.auth.user.id);
  }

  @Get('google')
  @ApiExcludeEndpoint()
  async googleStart(
    @Query('next') next: string | undefined,
    @Query('mode') mode: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    this.ensureGoogleEnabled();
    const origin = this.frontendOrigin();
    const linkMode = mode === 'link';
    if (linkMode) {
      let identity;
      try {
        identity = await this.auth.authenticate(this.cookies.read(req, 'access'));
      } catch {
        res.redirect(302, frontendAppUrl(origin, '/auth/login'));
        return;
      }
      const existing = await this.auth.accountFlags(identity.user.id);
      if (existing.googleLinked) {
        res.redirect(
          302,
          frontendProfileUrl(origin, {
            oauthError: GoogleOAuthErrorCodes.OAUTH_ACCOUNT_CONFLICT,
          }),
        );
        return;
      }
      const returnNext =
        oauthReturnPath(next) ?? '/app/profile';
      const start = this.oauthState.createStart({
        mode: 'link',
        linkUserId: identity.user.id,
        next: returnNext,
      });
      res.setHeader('Set-Cookie', start.setCookie);
      res.redirect(
        302,
        this.google.buildAuthorizationUrl({
          state: start.state,
          codeChallenge: start.codeChallenge,
        }),
      );
      return;
    }
    const start = this.oauthState.createStart({ next });
    res.setHeader('Set-Cookie', start.setCookie);
    res.redirect(
      302,
      this.google.buildAuthorizationUrl({
        state: start.state,
        codeChallenge: start.codeChallenge,
      }),
    );
  }

  @Get('google/callback')
  @ApiExcludeEndpoint()
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    this.ensureGoogleEnabled();
    const origin = this.frontendOrigin();
    if (!code || !state) {
      this.redirectOAuthError(res, GoogleOAuthErrorCodes.OAUTH_STATE_INVALID);
      return;
    }
    let oauthTarget: 'login' | 'profile' = 'login';
    try {
      const { codeVerifier, next, mode, linkUserId } =
        this.oauthState.validateCallback(req, state);
      oauthTarget = mode === 'link' ? 'profile' : 'login';
      const idToken = await this.google.exchangeCodeForIdToken(code, codeVerifier);
      const profile = await this.google.verifyIdToken(idToken);
      if (mode === 'link' && linkUserId) {
        let identity;
        try {
          identity = await this.auth.authenticate(
            this.cookies.read(req, 'access'),
          );
        } catch {
          this.redirectOAuthError(
            res,
            GoogleOAuthErrorCodes.OAUTH_STATE_INVALID,
            'profile',
          );
          return;
        }
        if (identity.user.id !== linkUserId) {
          this.redirectOAuthError(
            res,
            GoogleOAuthErrorCodes.OAUTH_STATE_INVALID,
            'profile',
          );
          return;
        }
        await this.auth.linkGoogleToUser(linkUserId, profile);
        this.oauthState.clearCookie(res);
        res.redirect(302, frontendProfileUrl(origin, { googleLinked: true }));
        return;
      }
      const result = await this.auth.signInWithGoogle(
        profile,
        this.cookies.read(req, 'refresh'),
      );
      this.cookies.set(res, result.tokens);
      this.oauthState.clearCookie(res);
      res.redirect(302, frontendAppUrl(origin, next));
    } catch (error) {
      const code =
        error instanceof GoogleOAuthError
          ? error.code
          : GoogleOAuthErrorCodes.OAUTH_ID_TOKEN_INVALID;
      if (oauthTarget === 'login') {
        try {
          const payload = this.oauthState.readStart(req);
          if (payload.mode === 'link') oauthTarget = 'profile';
        } catch {
          /* state unreadable */
        }
      }
      this.redirectOAuthError(res, code, oauthTarget);
    }
  }
}
