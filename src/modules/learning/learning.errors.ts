import { HttpException } from '@nestjs/common';

export function learningError(status: number, code: string, message: string): HttpException {
  return new HttpException({ statusCode: status, code, message }, status);
}
