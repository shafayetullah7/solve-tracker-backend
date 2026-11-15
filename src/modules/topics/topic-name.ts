export const TOPIC_NAME_MIN = 1;
export const TOPIC_NAME_MAX = 100;

import { measureCodePoints } from '../../common/unicode.js';

export { measureCodePoints } from '../../common/unicode.js';

export class TopicNameError extends Error {
  constructor(readonly code: 'EMPTY' | 'TOO_LONG') {
    super(
      code === 'EMPTY'
        ? 'Topic name must not be empty.'
        : `Topic name must contain at most ${TOPIC_NAME_MAX} characters.`,
    );
  }
}

export function normalizeTopicName(name: string): string {
  return name.toLocaleLowerCase('en-US');
}

export function prepareTopicName(raw: string): {
  name: string;
  normalizedName: string;
} {
  const name = raw.trim();
  const length = measureCodePoints(name);
  if (length < TOPIC_NAME_MIN) throw new TopicNameError('EMPTY');
  if (length > TOPIC_NAME_MAX) throw new TopicNameError('TOO_LONG');
  return { name, normalizedName: normalizeTopicName(name) };
}