import { HttpException } from '@nestjs/common';
import { PROFILE_NOT_FOUND_MESSAGE } from './discover.config.js';

export const DISCOVER_ERROR = {
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
} as const;

export function discoverError(
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

export function profileNotFound(): HttpException {
  return discoverError(
    404,
    DISCOVER_ERROR.PROFILE_NOT_FOUND,
    PROFILE_NOT_FOUND_MESSAGE,
  );
}