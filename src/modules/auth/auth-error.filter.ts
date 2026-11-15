import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import type { Response } from 'express';
@Catch()
export class AuthErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthErrorFilter.name);
  catch(error: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            typeof error.status === 'number' &&
            [400, 413, 415].includes(error.status)
          ? error.status
          : 500;
    const body = error instanceof HttpException ? error.getResponse() : null;
    if (status >= 500) {
      this.logger.error('Unexpected request failure.');
      res.status(status).json({
        statusCode: status,
        code: status === 503 ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_ERROR',
        message: 'Service is unavailable.',
      });
      return;
    }
    if (body && typeof body === 'object' && 'code' in body) {
      if (
        status === 429 &&
        'details' in body &&
        body.details &&
        typeof body.details === 'object' &&
        'retryAfter' in body.details &&
        typeof body.details.retryAfter === 'number'
      )
        res.setHeader('Retry-After', String(body.details.retryAfter));
      res.status(status).json(body);
      return;
    }
    res.status(status).json({
      statusCode: status,
      code:
        status === 413
          ? 'PAYLOAD_TOO_LARGE'
          : status === 400
            ? 'VALIDATION_ERROR'
            : status === 404
              ? 'NOT_FOUND'
              : 'FORBIDDEN',
      message:
        status === 413
          ? 'Request body is too large.'
          : status === 400
            ? 'Invalid input.'
            : 'Request rejected.',
    });
  }
}
