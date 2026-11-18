import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { codeChallengeS256, generateCodeVerifier } from './oauth-pkce.js';

describe('oauth-pkce', () => {
  it('generates verifier within RFC length and S256 challenge', () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    const challenge = codeChallengeS256(verifier);
    expect(challenge).not.toMatch(/[=+/]/);
    const manual = createHash('sha256')
      .update(verifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(challenge).toBe(manual);
  });
});