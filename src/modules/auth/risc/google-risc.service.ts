import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { decodeJwt, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { Environment } from '../../../config/environment.js';
import {
  GOOGLE_RISC_CONFIGURATION_URL,
  GOOGLE_RISC_DEFAULT_EVENT_TTL_SECONDS,
  GOOGLE_RISC_ISSUERS,
  GOOGLE_RISC_SET_CLOCK_TOLERANCE_SEC,
} from './google-risc.constants.js';
import {
  GoogleRiscError,
  GoogleRiscErrorCodes,
} from './google-risc.errors.js';
import { GoogleRiscJwksCache } from './google-risc-jwks.cache.js';
import {
  googleRiscPayloadSchema,
  type GoogleRiscPayload,
} from './google-risc.schema.js';
import type { RiscHandleOutcome, VerifiedRiscEvent, VerifiedRiscEventEntry } from './google-risc.types.js';
import { AuthService } from '../auth.service.js';
import { AUTH_PROVIDER_GOOGLE } from '../google/auth-providers.js';
import { AuthProviderIdentityRepository } from '../google/auth-provider-identity.repository.js';
import {
  auditReasonFor,
  collectMatchedEvents,
  firstProviderSubject,
  logAccountDisabled,
} from './google-risc-event.js';
import { RiscEventReceiptRepository } from './risc-event-receipt.repository.js';

const ACCOUNT_DISABLED_EVENT =
  'https://schemas.openid.net/secevent/risc/event-type/account-disabled';

@Injectable()
export class GoogleRiscService {
  private readonly logger = new Logger(GoogleRiscService.name);

  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly jwks: GoogleRiscJwksCache,
    private readonly receipts: RiscEventReceiptRepository,
    private readonly identities: AuthProviderIdentityRepository,
    @Inject(forwardRef(() => AuthService))
    private readonly auth: AuthService,
  ) {}

  isEnabled(): boolean {
    return this.config.getOrThrow('GOOGLE_RISC_ENABLED', { infer: true });
  }

  private requireEnabled(): void {
    if (!this.isEnabled())
      throw new GoogleRiscError(
        GoogleRiscErrorCodes.RISC_DISABLED,
        'Google RISC is not enabled.',
      );
  }

  audience(): string {
    return (
      this.config.get('GOOGLE_RISC_AUDIENCE') ??
      this.config.getOrThrow('GOOGLE_OAUTH_CLIENT_ID')
    );
  }

  jwksConfigurationUrl(): string {
    return (
      this.config.get('GOOGLE_RISC_JWKS_URL') ?? GOOGLE_RISC_CONFIGURATION_URL
    );
  }

  eventTtlSeconds(): number {
    return (
      this.config.get('GOOGLE_RISC_EVENT_TTL_SECONDS') ??
      GOOGLE_RISC_DEFAULT_EVENT_TTL_SECONDS
    );
  }

  /** Extract Google account id from an SET event subject (iss-sub). */
  parseGoogleAccountSub(event: VerifiedRiscEventEntry): string | undefined {
    return event.subjectSub;
  }

  private normalizeSet(rawBody: string): string {
    const token = rawBody.trim();
    if (!token) {
      throw new GoogleRiscError(
        GoogleRiscErrorCodes.RISC_SET_MALFORMED,
        'Security event token is empty.',
      );
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new GoogleRiscError(
        GoogleRiscErrorCodes.RISC_SET_MALFORMED,
        'Security event token is not a JWT.',
      );
    }
    try {
      decodeJwt(token);
    } catch {
      throw new GoogleRiscError(
        GoogleRiscErrorCodes.RISC_SET_MALFORMED,
        'Security event token is not a JWT.',
      );
    }
    return token;
  }

  private mapVerifyError(error: unknown): GoogleRiscError {
    if (error instanceof GoogleRiscError) return error;
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: string }).code)
        : '';
    if (code === 'ERR_JWKS_NO_MATCHING_KEY') {
      return new GoogleRiscError(
        GoogleRiscErrorCodes.RISC_SET_KEY_UNKNOWN,
        'Signing key for security event token was not found.',
      );
    }
    if (code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
      const claim =
        error &&
        typeof error === 'object' &&
        'claim' in error &&
        typeof (error as { claim: unknown }).claim === 'string'
          ? (error as { claim: string }).claim
          : '';
      if (claim === 'aud') {
        return new GoogleRiscError(
          GoogleRiscErrorCodes.RISC_SET_AUDIENCE_MISMATCH,
          'Security event token audience does not match.',
        );
      }
    }
    if (
      code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED' ||
      code === 'ERR_JWT_INVALID' ||
      code === 'ERR_JWS_INVALID'
    ) {
      return new GoogleRiscError(
        GoogleRiscErrorCodes.RISC_SET_INVALID,
        'Security event token verification failed.',
      );
    }
    return new GoogleRiscError(
      GoogleRiscErrorCodes.RISC_SET_INVALID,
      'Security event token verification failed.',
    );
  }

  private buildVerifiedEvent(payload: GoogleRiscPayload): VerifiedRiscEvent {
    const audience = Array.isArray(payload.aud) ? payload.aud[0]! : payload.aud;
    const events: Record<string, VerifiedRiscEventEntry> = {};
    for (const [type, body] of Object.entries(payload.events)) {
      const entry: VerifiedRiscEventEntry = {};
      if (body.reason !== undefined) entry.reason = body.reason;
      if (
        body.subject?.subject_type === 'iss-sub' &&
        body.subject.sub
      ) {
        entry.subjectSub = body.subject.sub;
      }
      events[type] = entry;
    }
    return {
      jti: payload.jti,
      iat: payload.iat,
      issuer: payload.iss,
      audience,
      events,
    };
  }

  async verifySet(
    rawBody: string,
    keySetOverride?: JWTVerifyGetKey,
  ): Promise<VerifiedRiscEvent> {
    this.requireEnabled();
    const token = this.normalizeSet(rawBody);
    let keySet: JWTVerifyGetKey;
    try {
      keySet = keySetOverride ?? (await this.jwks.getKeySet());
    } catch {
      throw new GoogleRiscError(
        GoogleRiscErrorCodes.RISC_JWKS_UNAVAILABLE,
        'Unable to load Google RISC signing keys.',
      );
    }
    try {
      const { payload } = await jwtVerify(token, keySet, {
        algorithms: ['RS256'],
        audience: this.audience(),
        issuer: [...GOOGLE_RISC_ISSUERS],
        clockTolerance: GOOGLE_RISC_SET_CLOCK_TOLERANCE_SEC,
      });
      const parsed = googleRiscPayloadSchema.parse(payload);
      return this.buildVerifiedEvent(parsed);
    } catch (error) {
      if (error instanceof GoogleRiscError) throw error;
      throw this.mapVerifyError(error);
    }
  }

  async handleVerifiedEvent(event: VerifiedRiscEvent): Promise<RiscHandleOutcome> {
    this.requireEnabled();
    const { jti } = event;
    if (await this.receipts.existsByJti(jti)) {
      return { status: 'duplicate', jti };
    }
    return this.receipts.transaction(async (tx) => {
      if (await this.receipts.existsByJti(jti, tx)) {
        return { status: 'duplicate', jti };
      }
      const cutoff = new Date(Date.now() - this.eventTtlSeconds() * 1000);
      await this.receipts.deleteReceivedBefore(cutoff, tx);

      const matched = collectMatchedEvents(event);
      const matchedEventTypes = Object.keys(matched);
      if (matchedEventTypes.length === 0) {
        const inserted = await this.receipts.createOrDuplicate(
          { jti, eventTypes: [], providerSubject: null, userId: null },
          tx,
        );
        if (inserted === 'duplicate') return { status: 'duplicate', jti };
        return { status: 'noop', jti };
      }

      const providerSubject = firstProviderSubject(matched);
      if (!providerSubject) {
        const inserted = await this.receipts.createOrDuplicate(
          {
            jti,
            eventTypes: matchedEventTypes,
            providerSubject: null,
            userId: null,
          },
          tx,
        );
        if (inserted === 'duplicate') return { status: 'duplicate', jti };
        return { status: 'orphan', jti, matchedEventTypes };
      }

      const identity = await this.identities.findByProviderSubject(
        AUTH_PROVIDER_GOOGLE,
        providerSubject,
      );
      if (!identity) {
        const inserted = await this.receipts.createOrDuplicate(
          {
            jti,
            eventTypes: matchedEventTypes,
            providerSubject,
            userId: null,
          },
          tx,
        );
        if (inserted === 'duplicate') return { status: 'duplicate', jti };
        return {
          status: 'orphan',
          jti,
          providerSubject,
          matchedEventTypes,
        };
      }

      const disabled = matched[ACCOUNT_DISABLED_EVENT];
      if (disabled) {
        logAccountDisabled(this.logger, {
          jti,
          providerSubject,
          userId: identity.userId,
          reason: disabled.reason,
        });
      }

      const auditReason = auditReasonFor(matchedEventTypes);
      const revokedCount = await this.auth.revokeAllSessionsForUser(
        identity.userId,
        auditReason,
        tx,
      );

      const inserted = await this.receipts.createOrDuplicate(
        {
          jti,
          eventTypes: matchedEventTypes,
          providerSubject,
          userId: identity.userId,
        },
        tx,
      );
      if (inserted === 'duplicate') return { status: 'duplicate', jti };

      return {
        status: 'revoked',
        jti,
        providerSubject,
        userId: identity.userId,
        revokedCount,
        matchedEventTypes,
      };
    });
  }
}