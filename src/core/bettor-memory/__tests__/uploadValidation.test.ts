import { describe, expect, it } from 'vitest';
import { MAX_SCREENSHOT_BYTES, validateScreenshotBytes } from '../uploadValidation';

const png = (width = 600, height = 1200) => {
  const bytes = Buffer.alloc(36);
  Buffer.from([137,80,78,71,13,10,26,10]).copy(bytes);
  bytes.writeUInt32BE(13, 8);
  bytes.write('IHDR', 12, 'ascii');
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
};

const jpeg = () => {
  const bytes = Buffer.alloc(32);
  Buffer.from([0xff,0xd8,0xff,0xe0,0x00,0x04,0x00,0x00,0xff,0xc0,0x00,0x11,0x08,0x03,0x20,0x02,0x58]).copy(bytes);
  return bytes;
};

const webp = () => {
  const bytes = Buffer.alloc(32);
  bytes.write('RIFF',0);
  bytes.writeUInt32LE(24, 4);
  bytes.write('WEBP',8);
  bytes.write('VP8X',12);
  bytes.writeUInt32LE(10,16);
  bytes.writeUIntLE(599,24,3);
  bytes.writeUIntLE(1199,27,3);
  return bytes;
};

describe('server-side screenshot validation', () => {
  it('accepts dimensioned PNG JPEG and WebP only when MIME matches signature', () => {
    expect(validateScreenshotBytes(png(),'image/png')).toMatchObject({ width:600,height:1200,extension:'png' });
    expect(validateScreenshotBytes(jpeg(),'image/jpeg')).toMatchObject({ width:600,height:800,extension:'jpg' });
    expect(validateScreenshotBytes(webp(),'image/webp')).toMatchObject({ width:600,height:1200,extension:'webp' });
    expect(validateScreenshotBytes(png(),'image/jpeg')).toBeNull();
    expect(validateScreenshotBytes(jpeg(),'image/png')).toBeNull();
  });
  it('rejects malformed files, bombs and unsupported types', () => {
    expect(validateScreenshotBytes(Buffer.from('fake browser upload'),'image/png')).toBeNull();
    expect(validateScreenshotBytes(png(0,600),'image/png')).toBeNull();
    expect(validateScreenshotBytes(png(10000,10000),'image/png')).toBeNull();
    expect(validateScreenshotBytes(png(12000,400),'image/png')).toBeNull();
    expect(validateScreenshotBytes(Buffer.alloc(MAX_SCREENSHOT_BYTES+1),'image/png')).toBeNull();
    expect(validateScreenshotBytes(webp(),'image/heic')).toBeNull();
  });
});
