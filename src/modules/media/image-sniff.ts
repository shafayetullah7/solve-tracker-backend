const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff]);
const GIF87 = 'GIF87a';
const GIF89 = 'GIF89a';
const RIFF = 'RIFF';
const WEBP = 'WEBP';

function startsWithBytes(buffer: Buffer, prefix: Uint8Array): boolean {
  if (buffer.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (buffer[i] !== prefix[i]) return false;
  }
  return true;
}

function startsWithAscii(buffer: Buffer, text: string, offset = 0): boolean {
  if (buffer.length < offset + text.length) return false;
  return buffer.toString('ascii', offset, offset + text.length) === text;
}

export function sniffImageMime(buffer: Buffer): string | undefined {
  if (startsWithBytes(buffer, PNG)) return 'image/png';
  if (startsWithBytes(buffer, JPEG)) return 'image/jpeg';
  if (
    startsWithAscii(buffer, GIF87) ||
    startsWithAscii(buffer, GIF89)
  ) {
    return 'image/gif';
  }
  if (
    startsWithAscii(buffer, RIFF) &&
    buffer.length >= 12 &&
    startsWithAscii(buffer, WEBP, 8)
  ) {
    return 'image/webp';
  }
  return undefined;
}

export function mimeMatchesBuffer(mime: string, buffer: Buffer): boolean {
  const detected = sniffImageMime(buffer);
  if (!detected) return false;
  if (detected === mime) return true;
  if (mime === 'image/jpg' && detected === 'image/jpeg') return true;
  return false;
}