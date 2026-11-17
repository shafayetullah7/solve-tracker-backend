/** Align with cp-frontend `profile-avatar-upload.ts`. */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const AVATAR_ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

export function extensionFromMime(mime: string): string | undefined {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return undefined;
  }
}