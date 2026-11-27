import { HttpException } from '@nestjs/common';

export function assessmentError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>,
): HttpException {
  return new HttpException(
    { statusCode: status, code, message, ...(details ? { details } : {}) },
    status,
  );
}