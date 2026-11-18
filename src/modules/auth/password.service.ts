import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import type { Environment } from '../../config/environment.js';
@Injectable()
export class PasswordService {
  private dummy?: Promise<string>;
  constructor(private readonly config: ConfigService<Environment, true>) {}
  hash(value: string): Promise<string> {
    return argon2.hash(value, {
      type: argon2.argon2id,
      memoryCost: this.config.getOrThrow('ARGON2_MEMORY_KIB', { infer: true }),
      timeCost: this.config.getOrThrow('ARGON2_TIME_COST', { infer: true }),
      parallelism: this.config.getOrThrow('ARGON2_PARALLELISM', {
        infer: true,
      }),
    });
  }
  async verify(value: string, hash?: string | null): Promise<boolean> {
    if (!hash) {
      this.dummy ??= this.hash(randomBytes(32).toString('hex'));
      await argon2.verify(await this.dummy, value);
      return false;
    }
    return argon2.verify(hash, value);
  }
}
