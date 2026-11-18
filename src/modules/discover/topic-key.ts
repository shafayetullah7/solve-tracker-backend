import { measureCodePoints } from '../../common/unicode.js';
import { normalizeTopicName } from '../topics/topic-name.js';
import { TOPIC_KEY_MAX_CODE_POINTS } from './discover.config.js';
import { profileNotFound } from './discover.errors.js';

export function encodeTopicKey(normalizedName: string): string {
  return encodeURIComponent(normalizedName.trim());
}

export function decodeTopicKey(rawKey: string): string {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawKey.trim());
  } catch {
    throw profileNotFound();
  }
  if (!decoded) throw profileNotFound();
  if (measureCodePoints(decoded) > TOPIC_KEY_MAX_CODE_POINTS) {
    throw profileNotFound();
  }
  return normalizeTopicName(decoded);
}