import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, desc } from 'drizzle-orm';
import { errors as joseErrors } from 'jose';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Environment } from '../../config/environment.js';
import {
  authSessions,
  passwordResetTokens,
  users,
} from '../../database/schema/index.js';
import type { User } from '../../database/schema/index.js';
import { userNameSchema } from '../../common/schemas/user-name.schema.js';
import { AuthLimiter } from './auth-security.guard.js';
import { AuthRepository, type AuthTx } from './auth.repository.js';
import { AuthProviderIdentityRepository } from './google/auth-provider-identity.repository.js';
import { AUTH_PROVIDER_GOOGLE } from './google/auth-providers.js';
import {
  GoogleOAuthError,
  GoogleOAuthErrorCodes,
} from './google/google-oauth.errors.js';
import type { VerifiedGoogleProfile } from './google/google-oauth.service.js';
import { PasswordService } from './password.service.js';
import { TokenService, digest, sameDigest } from './token.service.js';
import type { Claims, Tokens } from './token.service.js';
import { EmailService } from '../email/email.service.js';
import { authError } from './auth.errors.js';
import type {
  RegisterInput,
  LoginInput,
  ResetInput,
  ChangePasswordInput,
  SetPasswordInput,
} from './schemas/auth.schema.js';
const safeUser = (u: User) => ({ id: u.id, name: u.name, email: u.email });
const usable = (s: { revokedAt: Date | null; expiresAt: Date } | undefined) =>
  s && !s.revokedAt && s.expiresAt.getTime() > Date.now();
export const forgotMessage =
  'If an eligible account exists, password reset instructions will be sent.';
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly repo: AuthRepository,
    private readonly identities: AuthProviderIdentityRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly email: EmailService,
    private readonly config: ConfigService<Environment, true>,
    private readonly limiter: AuthLimiter,
  ) {}

  private googleDisplayName(profile: VerifiedGoogleProfile): string {
    if (profile.name) {
      const parsed = userNameSchema.safeParse(profile.name);
      if (parsed.success) return parsed.data;
    }
    const local = profile.email.split('@')[0] ?? 'User';
    const parsed = userNameSchema.safeParse(local);
    return parsed.success ? parsed.data : 'User';
  }

  private isUniqueViolation(error: unknown): boolean {
    const cause =
      (error as { cause?: { code?: string } })?.cause ??
      (error as { code?: string });
    return cause?.code === '23505';
  }

  async establishOAuthSession(
    userId: string,
    previousRefresh?: string,
  ): Promise<{ user: ReturnType<typeof safeUser>; tokens: Tokens }> {
    if (previousRefresh) await this.logout(undefined, previousRefresh);
    const result = await this.repo.withUser(userId, async (tx, user) => {
      const id = randomUUID(),
        expiresAt = new Date(
          Date.now() +
            this.config.getOrThrow('AUTH_SESSION_TTL_SECONDS', {
              infer: true,
            }) *
              1000,
        );
      const tokens = await this.tokens.issue(user.id, id, expiresAt);
      await tx.insert(authSessions).values({
        id,
        userId: user.id,
        refreshDigest: digest(tokens.refresh),
        expiresAt: tokens.expiresAt,
      });
      return { user: safeUser(user), tokens };
    });
    if (!result)
      throw authError(404, 'NOT_FOUND', 'Account was not found.');
    return result;
  }

  async signInWithGoogle(
    profile: VerifiedGoogleProfile,
    previousRefresh?: string,
  ): Promise<{ user: ReturnType<typeof safeUser>; tokens: Tokens }> {
    try {
      const linked = await this.identities.findByProviderSubject(
        AUTH_PROVIDER_GOOGLE,
        profile.subject,
      );
      if (linked) {
        const user = await this.repo.findUserById(linked.userId);
        if (!user)
          throw new GoogleOAuthError(
            GoogleOAuthErrorCodes.OAUTH_ACCOUNT_CONFLICT,
            'Google account link is invalid.',
          );
        await this.identities.upsertByProviderSubject({
          userId: user.id,
          provider: AUTH_PROVIDER_GOOGLE,
          providerSubject: profile.subject,
          providerEmail: profile.email,
        });
        const session = await this.establishOAuthSession(
          user.id,
          previousRefresh,
        );
        this.logger.log(
          `Google OAuth sign_in userId=${user.id} provider=google outcome=sign_in`,
        );
        return session;
      }
      const existing = await this.repo.findUser(profile.email);
      if (existing) {
        await this.identities.upsertByProviderSubject({
          userId: existing.id,
          provider: AUTH_PROVIDER_GOOGLE,
          providerSubject: profile.subject,
          providerEmail: profile.email,
        });
        const session = await this.establishOAuthSession(
          existing.id,
          previousRefresh,
        );
        this.logger.log(
          `Google OAuth sign_in userId=${existing.id} provider=google outcome=link`,
        );
        return session;
      }
      const user = await this.repo.createUser({
        name: this.googleDisplayName(profile),
        email: profile.email,
        passwordHash: null,
      });
      await this.identities.create({
        userId: user.id,
        provider: AUTH_PROVIDER_GOOGLE,
        providerSubject: profile.subject,
        providerEmail: profile.email,
      });
      const session = await this.establishOAuthSession(user.id, previousRefresh);
      this.logger.log(
        `Google OAuth sign_in userId=${user.id} provider=google outcome=register`,
      );
      return session;
    } catch (error) {
      if (error instanceof GoogleOAuthError) throw error;
      if (this.isUniqueViolation(error))
        throw new GoogleOAuthError(
          GoogleOAuthErrorCodes.OAUTH_ACCOUNT_CONFLICT,
          'Unable to link Google account.',
        );
      throw error;
    }
  }

  async linkGoogleToUser(
    userId: string,
    profile: VerifiedGoogleProfile,
  ): Promise<void> {
    const user = await this.repo.findUserById(userId);
    if (!user)
      throw authError(404, 'NOT_FOUND', 'Account was not found.');
    const linked = await this.identities.findByProviderSubject(
      AUTH_PROVIDER_GOOGLE,
      profile.subject,
    );
    if (linked && linked.userId !== userId)
      throw new GoogleOAuthError(
        GoogleOAuthErrorCodes.OAUTH_ACCOUNT_CONFLICT,
        'This Google account is linked to another user.',
      );
    await this.identities.upsertByProviderSubject({
      userId,
      provider: AUTH_PROVIDER_GOOGLE,
      providerSubject: profile.subject,
      providerEmail: profile.email,
    });
    this.logger.log(
      `Google OAuth link userId=${userId} provider=google outcome=profile_link`,
    );
  }

  async unlinkGoogle(userId: string): Promise<void> {
    const user = await this.repo.findUserById(userId);
    if (!user)
      throw authError(404, 'NOT_FOUND', 'Account was not found.');
    if (user.passwordHash == null)
      throw authError(
        400,
        'PASSWORD_REQUIRED_TO_UNLINK',
        'Set a password before unlinking Google.',
      );
    await this.identities.deleteByUserAndProvider(userId, AUTH_PROVIDER_GOOGLE);
  }

  async setPassword(userId: string, input: SetPasswordInput): Promise<void> {
    const updated = await this.repo.withUser(userId, async (tx, user) => {
      if (user.passwordHash != null)
        throw authError(
          400,
          'PASSWORD_ALREADY_SET',
          'A password is already set.',
        );
      const hash = await this.passwords.hash(input.newPassword);
      const now = new Date();
      await tx
        .update(users)
        .set({ passwordHash: hash, updatedAt: now })
        .where(eq(users.id, user.id));
      return true;
    });
    if (!updated)
      throw authError(404, 'NOT_FOUND', 'Account was not found.');
  }

  async accountFlags(userId: string): Promise<{
    googleLinked: boolean;
    hasPassword: boolean;
  }> {
    const user = await this.repo.findUserById(userId);
    if (!user)
      throw authError(404, 'NOT_FOUND', 'Account was not found.');
    const google = await this.identities.findByUserAndProvider(
      userId,
      AUTH_PROVIDER_GOOGLE,
    );
    return {
      googleLinked: Boolean(google),
      hasPassword: user.passwordHash != null,
    };
  }

  async register(input: RegisterInput) {
    try {
      return {
        user: safeUser(
          await this.repo.createUser({
            name: input.name,
            email: input.email,
            passwordHash: await this.passwords.hash(input.password),
          }),
        ),
      };
    } catch (error) {
      const cause =
        (error as { cause?: { code?: string; constraint?: string } })?.cause ??
        (error as { code?: string; constraint?: string });
      if (
        cause.code === '23505' &&
        ['users_email_key', 'users_email_unique'].includes(
          cause.constraint ?? '',
        )
      )
        throw authError(409, 'EMAIL_IN_USE', 'Email is already registered.');
      throw error;
    }
  }
  private async optional(
    raw: string | undefined,
    purpose: 'access' | 'refresh',
  ): Promise<Claims | null> {
    if (!raw) return null;
    try {
      return await this.tokens.verify(raw, purpose);
    } catch {
      return null;
    }
  }
  async login(
    input: LoginInput,
    previousRefresh?: string,
  ): Promise<{ user: ReturnType<typeof safeUser>; tokens: Tokens }> {
    const candidate = await this.repo.findUser(input.email);
    const verified = await this.passwords.verify(
      input.password,
      candidate?.passwordHash,
    );
    if (!candidate || !verified)
      throw authError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    const current = await this.repo.findUserById(candidate.id);
    if (!current || current.passwordHash !== candidate.passwordHash)
      throw authError(
        401,
        'INVALID_CREDENTIALS',
        'Credentials changed. Please log in again.',
      );
    return this.establishOAuthSession(candidate.id, previousRefresh);
  }
  async authenticate(raw?: string) {
    if (!raw)
      throw authError(401, 'AUTH_REFRESH_REQUIRED', 'Authentication required.');
    let claims: Claims;
    try {
      claims = await this.tokens.verify(raw, 'access');
    } catch (error) {
      if (error instanceof joseErrors.JWTExpired)
        throw authError(401, 'AUTH_REFRESH_REQUIRED', 'Access expired.');
      throw authError(401, 'AUTH_SESSION_INVALID', 'Invalid session.');
    }
    const entry = await this.repo.activeUser(claims.sub, claims.sid);
    if (!entry || !usable(entry.session))
      throw authError(401, 'AUTH_SESSION_INVALID', 'Invalid session.');
    return { user: safeUser(entry.user), sessionId: claims.sid };
  }
  async refresh(raw?: string) {
    const claims = await this.optional(raw, 'refresh');
    if (!claims || !raw)
      throw authError(401, 'AUTH_REFRESH_INVALID', 'Session recovery failed.');
    const retry = this.limiter.check(
      `refresh-session:${claims.sid}`,
      10,
      60000,
    );
    if (retry)
      throw authError(429, 'RATE_LIMITED', 'Too many session refreshes.', {
        retryAfter: retry,
      });
    const result = await this.repo.withUser(claims.sub, async (tx, user) => {
      const session = await this.repo.session(claims.sid, user.id, tx);
      if (!usable(session)) return null;
      if (!sameDigest(session!.refreshDigest, digest(raw))) {
        await tx
          .update(authSessions)
          .set({ revokedAt: new Date(), updatedAt: new Date() })
          .where(eq(authSessions.id, claims.sid));
        return null;
      }
      const tokens = await this.tokens.issue(
        user.id,
        claims.sid,
        session!.expiresAt,
      );
      await tx
        .update(authSessions)
        .set({ refreshDigest: digest(tokens.refresh), updatedAt: new Date() })
        .where(eq(authSessions.id, claims.sid));
      return { user: safeUser(user), tokens };
    });
    // Throw AFTER transaction commits so replay revocation is not rolled back.
    if (!result)
      throw authError(401, 'AUTH_REFRESH_INVALID', 'Session recovery failed.');
    return result;
  }
  async logout(access?: string, refresh?: string) {
    const claims =
      (await this.optional(refresh, 'refresh')) ??
      (await this.optional(access, 'access'));
    if (claims)
      await this.repo.withUser(claims.sub, async (tx) => {
        await tx
          .update(authSessions)
          .set({ revokedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(authSessions.id, claims.sid),
              eq(authSessions.userId, claims.sub),
            ),
          );
      });
  }
  async forgot(email: string) {
    const candidate = await this.repo.findUser(email);
    if (!candidate) return { message: forgotMessage };
    const token = await this.repo.withUser(candidate.id, async (tx, user) => {
      const last = (
        await tx
          .select()
          .from(passwordResetTokens)
          .where(eq(passwordResetTokens.userId, user.id))
          .orderBy(desc(passwordResetTokens.createdAt))
          .limit(1)
      )[0];
      if (last && Date.now() - last.createdAt.getTime() < 60000) return null;
      const raw = randomBytes(32).toString('base64url');
      await tx
        .update(passwordResetTokens)
        .set({ consumedAt: new Date() })
        .where(eq(passwordResetTokens.userId, user.id));
      await tx.insert(passwordResetTokens).values({
        userId: user.id,
        digest: digest(raw),
        expiresAt: new Date(
          Date.now() +
            this.config.getOrThrow('PASSWORD_RESET_TTL_SECONDS', {
              infer: true,
            }) *
              1000,
        ),
      });
      return raw;
    });
    if (token) await this.email.sendReset(candidate.email, token);
    return { message: forgotMessage };
  }
  async reset(input: ResetInput) {
    const hash = digest(input.token),
      candidate = await this.repo.resetToken(hash);
    if (
      !candidate ||
      candidate.consumedAt ||
      candidate.expiresAt.getTime() <= Date.now()
    )
      throw authError(
        400,
        'RESET_TOKEN_INVALID',
        'Reset link is invalid or expired.',
      );
    const passwordHash = await this.passwords.hash(input.password);
    const result = await this.repo.withUser(
      candidate.userId,
      async (tx, user) => {
        const token = (
          await tx
            .select()
            .from(passwordResetTokens)
            .where(eq(passwordResetTokens.id, candidate.id))
        )[0];
        if (
          !token ||
          token.consumedAt ||
          token.expiresAt.getTime() <= Date.now() ||
          !sameDigest(token.digest, hash)
        )
          return false;
        const now = new Date();
        await tx
          .update(users)
          .set({ passwordHash, updatedAt: now })
          .where(eq(users.id, user.id));
        await tx
          .update(passwordResetTokens)
          .set({ consumedAt: now })
          .where(eq(passwordResetTokens.userId, user.id));
        await this.revokeAllSessionsForUser(user.id, 'password-reset', tx);
        return true;
      },
    );
    if (!result)
      throw authError(
        400,
        'RESET_TOKEN_INVALID',
        'Reset link is invalid or expired.',
      );
  }

  async revokeAllSessionsForUser(
    userId: string,
    auditReason: string,
    tx?: AuthTx,
  ): Promise<number> {
    const db = tx ?? this.repo.db;
    const now = new Date();
    const updated = await db
      .update(authSessions)
      .set({ revokedAt: now, updatedAt: now })
      .where(eq(authSessions.userId, userId))
      .returning({ id: authSessions.id });
    if (updated.length > 0) {
      this.logger.log(
        `Revoked ${updated.length} session(s) for user ${userId} (${auditReason})`,
      );
    }
    return updated.length;
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const passwordHash = await this.repo.withUser(userId, async (tx, user) => {
      const valid = await this.passwords.verify(
        input.currentPassword,
        user.passwordHash,
      );
      if (!valid) {
        throw authError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect.');
      }
      const same = await this.passwords.verify(
        input.newPassword,
        user.passwordHash,
      );
      if (same) {
        throw authError(400, 'VALIDATION_ERROR', 'Invalid input.', {
          newPassword: 'Choose a different password.',
        });
      }
      const hash = await this.passwords.hash(input.newPassword);
      const now = new Date();
      await tx
        .update(users)
        .set({ passwordHash: hash, updatedAt: now })
        .where(eq(users.id, user.id));
      await this.revokeAllSessionsForUser(user.id, 'change-password', tx);
      return hash;
    });
    if (!passwordHash)
      throw authError(404, 'NOT_FOUND', 'Account was not found.');
  }
}
