import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import type { Environment } from '../../config/environment.js';
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  constructor(private readonly config: ConfigService<Environment, true>) {}
  async sendReset(to: string, token: string): Promise<void> {
    if (
      this.config.getOrThrow('EMAIL_DELIVERY_MODE', { infer: true }) === 'mock'
    )
      return;
    const url = new URL(
      '/reset-password',
      this.config.getOrThrow('FRONTEND_ORIGIN', { infer: true }),
    );
    url.hash = `token=${encodeURIComponent(token)}`;
    try {
      const result = await new Resend(
        this.config.getOrThrow('RESEND_API_KEY', { infer: true }),
      ).emails.send(
        {
          from: this.config.getOrThrow('RESEND_FROM', { infer: true }),
          to,
          subject: 'Reset your Practice password',
          text: `Use this link to reset your password: ${url.toString()}\nThis link expires in ${this.config.getOrThrow('PASSWORD_RESET_TTL_SECONDS', { infer: true }) / 60} minutes. If you did not request this, ignore this email.`,
        },
        { signal: AbortSignal.timeout(10000) },
      );
      if (result.error) throw new Error('Email provider rejected request');
    } catch {
      this.logger.error(
        'Password reset email delivery could not be confirmed.',
      );
    }
  }
}
