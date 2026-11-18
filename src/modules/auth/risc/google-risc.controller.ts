import {
  Controller,
  HttpCode,
  Logger,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { GoogleRiscRateLimitGuard } from './google-risc-rate-limit.guard.js';
import {
  emptySetBodyError,
  googleRiscErrorDisposition,
  logRiscOutcome,
  rawSetBodyFromRequest,
} from './google-risc-http.js';
import { GoogleRiscService } from './google-risc.service.js';

@ApiTags('Internal webhooks')
@Controller('auth/google')
export class GoogleRiscController {
  private readonly logger = new Logger(GoogleRiscController.name);

  constructor(private readonly risc: GoogleRiscService) {}

  @Post('risc')
  @HttpCode(202)
  @UseGuards(GoogleRiscRateLimitGuard)
  @ApiOperation({
    summary: 'Google Cross-Account Protection (RISC) receiver',
    description:
      'Accepts a raw Security Event Token (JWT) in the request body. Returns 404 when GOOGLE_RISC_ENABLED is false. No CSRF headers required (server-to-server).',
  })
  @ApiResponse({ status: 202, description: 'SET accepted and processed (or idempotent replay).' })
  @ApiResponse({ status: 400, description: 'Malformed SET or unknown signing key.' })
  @ApiResponse({ status: 401, description: 'Invalid SET signature or claims.' })
  @ApiResponse({ status: 404, description: 'RISC feature disabled.' })
  @ApiResponse({ status: 429, description: 'Webhook rate limit exceeded.' })
  @ApiResponse({ status: 500, description: 'Transient processing failure.' })
  async receiveSecurityEventToken(@Req() req: Request): Promise<void> {
    if (!this.risc.isEnabled()) throw new NotFoundException();
    const raw = rawSetBodyFromRequest(req);
    if (!raw.trim()) throw emptySetBodyError();

    let verified;
    try {
      verified = await this.risc.verifySet(raw);
    } catch (error) {
      const disposition = googleRiscErrorDisposition(error);
      if (disposition.kind === 'accept_202') {
        this.logger.error(
          'Google RISC SET audience mismatch — accepted with 202 to avoid delivery retry storm',
        );
        return;
      }
      if (disposition.kind === 'throw') throw disposition.error;
      throw error;
    }

    try {
      const outcome = await this.risc.handleVerifiedEvent(verified);
      logRiscOutcome(this.logger, outcome);
    } catch (error) {
      this.logger.error('Google RISC event processing failed');
      throw error;
    }
  }
}