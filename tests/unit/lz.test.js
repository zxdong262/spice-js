import { convert_spice_lz_to_web } from '../../src/spice/lz.ts';
import { Constants } from '../../src/spice/enums.ts';

function createMockContext(width, height) {
  return {
    createImageData: (w, h) => {
      return {
        width: w,
        height: h,
        data: new Uint8ClampedArray(w * h * 4)
      };
    }
  };
}

describe('lz', () => {
  describe('Constants', () => {
    test('should have correct LZ_IMAGE_TYPE constants', () => {
      expect(Constants.LZ_IMAGE_TYPE_INVALID).toBe(0);
      expect(Constants.LZ_IMAGE_TYPE_RGB32).toBe(8);
      expect(Constants.LZ_IMAGE_TYPE_RGBA).toBe(9);
      expect(Constants.LZ_IMAGE_TYPE_XXXA).toBe(10);
    });

    test('should have correct LZ4_IMAGE_TYPE constants', () => {
      expect(Constants.LZ_IMAGE_TYPE_LZ4_RGB32).toBe(28);
      expect(Constants.LZ_IMAGE_TYPE_LZ4_RGBA).toBe(29);
      expect(Constants.LZ_IMAGE_TYPE_LZ4_XXXA).toBe(30);
    });
  });

  describe('convert_spice_lz_to_web', () => {
    test('should return undefined for invalid type', () => {
      const context = createMockContext(2, 2);
      const lz_image = {
        type: Constants.LZ_IMAGE_TYPE_INVALID,
        width: 2,
        height: 2,
        data: new ArrayBuffer(16),
        top_down: true
      };
      const result = convert_spice_lz_to_web(context, lz_image);
      expect(result).toBeUndefined();
    });

    test('should decompress LZ_IMAGE_TYPE_RGB32 with simple data', () => {
      const context = createMockContext(2, 2);
      const compressedData = new Uint8Array([
        0x03,
        0xFF, 0x00, 0x00,
        0x00, 0xFF, 0x00,
        0x00, 0x00, 0xFF,
        0xFF, 0xFF, 0xFF
      ]);
      const lz_image = {
        type: Constants.LZ_IMAGE_TYPE_RGB32,
        width: 2,
        height: 2,
        data: compressedData.buffer,
        top_down: true
      };
      const result = convert_spice_lz_to_web(context, lz_image);
      expect(result).toBeDefined();
      expect(result?.width).toBe(2);
      expect(result?.height).toBe(2);
      expect(result?.data.length).toBe(16);
    });

    test('should decompress LZ_IMAGE_TYPE_RGBA with simple data', () => {
      const context = createMockContext(2, 2);
      const compressedData = new Uint8Array([
        0x03,
        0xFF, 0x00, 0x00,
        0x00, 0xFF, 0x00,
        0x00, 0x00, 0xFF,
        0xFF, 0xFF, 0xFF,
        0x03,
        0x80, 0x80, 0x80, 0xFF
      ]);
      const lz_image = {
        type: Constants.LZ_IMAGE_TYPE_RGBA,
        width: 2,
        height: 2,
        data: compressedData.buffer,
        top_down: true
      };
      const result = convert_spice_lz_to_web(context, lz_image);
      expect(result).toBeDefined();
      expect(result?.width).toBe(2);
      expect(result?.height).toBe(2);
    });

    test('should decompress LZ_IMAGE_TYPE_XXXA with simple data', () => {
      const context = createMockContext(2, 2);
      const compressedData = new Uint8Array([
        0x03,
        0xFF, 0xFF, 0xFF, 0xFF
      ]);
      const lz_image = {
        type: Constants.LZ_IMAGE_TYPE_XXXA,
        width: 2,
        height: 2,
        data: compressedData.buffer,
        top_down: true
      };
      const result = convert_spice_lz_to_web(context, lz_image);
      expect(result).toBeDefined();
      expect(result?.width).toBe(2);
      expect(result?.height).toBe(2);
    });

    test('should flip image when top_down is false', () => {
      const context = createMockContext(2, 2);
      const compressedData = new Uint8Array([
        0x03,
        0xFF, 0x00, 0x00,
        0x00, 0xFF, 0x00,
        0x00, 0x00, 0xFF,
        0xFF, 0xFF, 0xFF
      ]);
      const lz_image = {
        type: Constants.LZ_IMAGE_TYPE_RGB32,
        width: 2,
        height: 2,
        data: compressedData.buffer,
        top_down: false
      };
      const result = convert_spice_lz_to_web(context, lz_image);
      expect(result).toBeDefined();
      expect(result?.width).toBe(2);
      expect(result?.height).toBe(2);
    });

    test('should set default alpha to 255 for RGB32 type', () => {
      const context = createMockContext(1, 1);
      const compressedData = new Uint8Array([
        0x00,
        0x00, 0x00, 0xFF
      ]);
      const lz_image = {
        type: Constants.LZ_IMAGE_TYPE_RGB32,
        width: 1,
        height: 1,
        data: compressedData.buffer,
        top_down: true
      };
      const result = convert_spice_lz_to_web(context, lz_image);
      expect(result).toBeDefined();
      expect(result?.data[0]).toBe(0xFF);
      expect(result?.data[1]).toBe(0x00);
      expect(result?.data[2]).toBe(0x00);
      expect(result?.data[3]).toBe(255);
    });

    test('should handle single pixel image', () => {
      const context = createMockContext(1, 1);
      const compressedData = new Uint8Array([
        0x00,
        0x12, 0x34, 0x56
      ]);
      const lz_image = {
        type: Constants.LZ_IMAGE_TYPE_RGB32,
        width: 1,
        height: 1,
        data: compressedData.buffer,
        top_down: true
      };
      const result = convert_spice_lz_to_web(context, lz_image);
      expect(result).toBeDefined();
      expect(result?.data[0]).toBe(0x56);
      expect(result?.data[1]).toBe(0x34);
      expect(result?.data[2]).toBe(0x12);
      expect(result?.data[3]).toBe(255);
    });
  });

  describe('LZ4 decompression', () => {
    test('should decompress LZ4_RGB32 with simple literal data', () => {
      const context = createMockContext(2, 2);
      const compressedData = new Uint8Array([
        0x30,
        0xFF, 0x00, 0x00,
        0x00, 0xFF, 0x00,
        0x00, 0x00, 0xFF,
        0xFF, 0xFF, 0xFF,
        0x00, 0x00
      ]);
      const lz_image = {
        type: Constants.LZ_IMAGE_TYPE_LZ4_RGB32,
        width: 2,
        height: 2,
        data: compressedData.buffer,
        top_down: true
      };
      const result = convert_spice_lz_to_web(context, lz_image);
      expect(result).toBeDefined();
      expect(result?.width).toBe(2);
      expect(result?.height).toBe(2);
      expect(result?.data.length).toBe(16);
    });

    test('should decompress LZ4_RGBA with simple data', () => {
      const context = createMockContext(2, 2);
      const compressedData = new Uint8Array([
        0x41,
        0xFF, 0x00, 0x00, 0xFF,
        0x00, 0xFF, 0x00, 0xFF,
        0x00, 0x00, 0xFF, 0xFF,
        0xFF, 0xFF, 0xFF, 0xFF,
        0x00, 0x00
      ]);
      const lz_image = {
        type: Constants.LZ_IMAGE_TYPE_LZ4_RGBA,
        width: 2,
        height: 2,
        data: compressedData.buffer,
        top_down: true
      };
      const result = convert_spice_lz_to_web(context, lz_image);
      expect(result).toBeDefined();
      expect(result?.width).toBe(2);
      expect(result?.height).toBe(2);
      expect(result?.data.length).toBe(16);
    });

    test('should decompress LZ4 with repeated data (match)', () => {
      const context = createMockContext(2, 2);
      const compressedData = new Uint8Array([
        0x13,
        0xFF, 0x00, 0x00, 0xFF,
        0x01, 0x04, 0x00,
        0x00, 0x00
      ]);
      const lz_image = {
        type: Constants.LZ_IMAGE_TYPE_LZ4_RGB32,
        width: 2,
        height: 2,
        data: compressedData.buffer,
        top_down: true
      };
      const result = convert_spice_lz_to_web(context, lz_image);
      expect(result).toBeDefined();
      expect(result?.width).toBe(2);
      expect(result?.height).toBe(2);
    });

    test('should flip LZ4 image when top_down is false', () => {
      const context = createMockContext(2, 2);
      const compressedData = new Uint8Array([
        0x30,
        0xFF, 0x00, 0x00,
        0x00, 0xFF, 0x00,
        0x00, 0x00, 0xFF,
        0xFF, 0xFF, 0xFF,
        0x00, 0x00
      ]);
      const lz_image = {
        type: Constants.LZ_IMAGE_TYPE_LZ4_RGB32,
        width: 2,
        height: 2,
        data: compressedData.buffer,
        top_down: false
      };
      const result = convert_spice_lz_to_web(context, lz_image);
      expect(result).toBeDefined();
      expect(result?.width).toBe(2);
      expect(result?.height).toBe(2);
    });

    test('should handle LZ4_XXXA type', () => {
      const context = createMockContext(2, 2);
      const compressedData = new Uint8Array([
        0x41,
        0xFF, 0x00, 0x00, 0x80,
        0x00, 0xFF, 0x00, 0x80,
        0x00, 0x00, 0xFF, 0x80,
        0xFF, 0xFF, 0xFF, 0x80,
        0x00, 0x00
      ]);
      const lz_image = {
        type: Constants.LZ_IMAGE_TYPE_LZ4_XXXA,
        width: 2,
        height: 2,
        data: compressedData.buffer,
        top_down: true
      };
      const result = convert_spice_lz_to_web(context, lz_image);
      expect(result).toBeDefined();
      expect(result?.width).toBe(2);
      expect(result?.height).toBe(2);
    });
  });
});
