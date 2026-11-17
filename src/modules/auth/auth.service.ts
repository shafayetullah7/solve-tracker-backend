import { Injectable } from '@nestjs/common';
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
import { AuthLimiter } from './auth-security.guard.js';
import { AuthRepository } from './auth.repository.js';
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
} from './schemas/auth.schema.js';
const safeUser = (u: User) => ({ id: u.id, name: u.name, email: u.email });
const usable = (s: { revokedAt: Date | null; expiresAt: Date } | undefined) =>
  s && !s.revokedAt && s.expiresAt.getTime() > Date.now();
export const forgotMessage =
  'If an eligible account exists, password reset instructions will be sent.';
@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly email: EmailService,
    private readonly config: ConfigService<Environment, true>,
    private readonly limiter: AuthLimiter,
  ) {}
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
    if (previousRefresh) await this.logout(undefined, previousRefresh);
    const result = await this.repo.withUser(candidate.id, async (tx, user) => {
      if (user.passwordHash !== candidate.passwordHash) return null;
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
      throw authError(
        401,
        'INVALID_CREDENTIALS',
        'Credentials changed. Please log in again.',
      );
    return result;
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
        await tx
          .update(authSessions)
          .set({ revokedAt: now, updatedAt: now })
          .where(eq(authSessions.userId, user.id));
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
      await tx
        .update(authSessions)
        .set({ revokedAt: now, updatedAt: now })
        .where(eq(authSessions.userId, user.id));
      return hash;
    });
    if (!passwordHash)
      throw authError(404, 'NOT_FOUND', 'Account was not found.');
  }
}
