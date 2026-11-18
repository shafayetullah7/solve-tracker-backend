import { createHash, randomBytes } from 'node:crypto';

const VERIFIER_LENGTH = 64;

function base64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateCodeVerifier(): string {
  return base64Url(randomBytes(VERIFIER_LENGTH));
}

export function codeChallengeS256(codeVerifier: string): string {
  return base64Url(createHash('sha256').update(codeVerifier).digest());
}