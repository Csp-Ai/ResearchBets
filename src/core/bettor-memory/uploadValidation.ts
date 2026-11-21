/**
 * Bounded, signature-checked sportsbook image intake. Never trust the filename,
 * browser Content-Type or client-reported dimensions as an image validator.
 */
export type ValidatedScreenshot = {
  mime: 'image/png' | 'image/jpeg' | 'image/webp';
  extension: 'png' | 'jpg' | 'webp';
  width: number;
  height: number;
};
export const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_SIDE = 10000;
export const MAX_IMAGE_PIXELS = 30_000_000;

function dimensionsWithinLimit(width: number, height: number): boolean {
  return width > 0 && height > 0 && width <= MAX_IMAGE_SIDE && height <= MAX_IMAGE_SIDE &&
    width * height <= MAX_IMAGE_PIXELS;
}

function jpegDimensions(bytes: Buffer): { width: number; height: number } | null {
  let index = 2;
  const sof = new Set([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf]);
  while (index + 8 < bytes.length) {
    if (bytes[index] !== 0xff) { index += 1; continue; }
    while (index < bytes.length && bytes[index] === 0xff) index += 1;
    const marker = bytes[index++];
    if (marker === undefined || marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (index + 2 > bytes.length) break;
    const length = bytes.readUInt16BE(index);
    if (length < 2 || index + length > bytes.length) break;
    if (sof.has(marker) && length >= 7) {
      return { height: bytes.readUInt16BE(index + 3), width: bytes.readUInt16BE(index + 5) };
    }
    index += length;
  }
  return null;
}

export function validateScreenshotBytes(bytes: Buffer, mime: string): ValidatedScreenshot | null {
  if (bytes.length < 24 || bytes.length > MAX_SCREENSHOT_BYTES) return null;
  let dimensions: { width: number; height: number } | null = null;
  let extension: ValidatedScreenshot['extension'];
  if (mime === 'image/png') {
    const magic = Buffer.from([137,80,78,71,13,10,26,10]);
    if (!bytes.subarray(0,8).equals(magic) || bytes.toString('ascii',12,16) !== 'IHDR') return null;
    dimensions = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    extension = 'png';
  } else if (mime === 'image/jpeg') {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) return null;
    dimensions = jpegDimensions(bytes);
    extension = 'jpg';
  } else if (mime === 'image/webp') {
    if (bytes.toString('ascii',0,4) !== 'RIFF' || bytes.toString('ascii',8,12) !== 'WEBP') return null;
    const chunk = bytes.toString('ascii',12,16);
    if (chunk === 'VP8X' && bytes.length >= 30) {
      dimensions = {
        width: 1 + bytes.readUIntLE(24,3),
        height: 1 + bytes.readUIntLE(27,3)
      };
    } else if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
      const packed = bytes.readUInt32LE(21);
      dimensions = { width: (packed & 0x3fff) + 1, height: ((packed >>> 14) & 0x3fff) + 1 };
    } else if (chunk === 'VP8 ' && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      dimensions = { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    }
    extension = 'webp';
  } else {
    return null;
  }
  if (!dimensions || !dimensionsWithinLimit(dimensions.width, dimensions.height)) return null;
  return { mime: mime as ValidatedScreenshot['mime'], extension, ...dimensions };
}
