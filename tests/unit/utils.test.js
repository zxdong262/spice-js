import { 
  DEBUG, 
  PLAYBACK_DEBUG, 
  STREAM_DEBUG, 
  DUMP_DRAWS, 
  DUMP_CANVASES, 
  EMPTY_GIF_IMAGE, 
  combine_array_buffers, 
  arraybuffer_to_str, 
  keycode_to_start_scan, 
  keycode_to_end_scan 
} from '../../src/spice/utils.ts';

describe('Utils', () => {
  test('should export correct debug flags', () => {
    expect(DEBUG).toBe(0);
    expect(PLAYBACK_DEBUG).toBe(0);
    expect(STREAM_DEBUG).toBe(0);
    expect(DUMP_DRAWS).toBe(false);
    expect(DUMP_CANVASES).toBe(false);
  });

  test('should export correct empty gif image', () => {
    expect(EMPTY_GIF_IMAGE).toBe("data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=");
  });

  test('should combine array buffers correctly', () => {
    const buffer1 = new ArrayBuffer(2);
    const view1 = new Uint8Array(buffer1);
    view1[0] = 1;
    view1[1] = 2;

    const buffer2 = new ArrayBuffer(2);
    const view2 = new Uint8Array(buffer2);
    view2[0] = 3;
    view2[1] = 4;

    const combined = combine_array_buffers(buffer1, buffer2);
    const combinedView = new Uint8Array(combined);

    expect(combined.byteLength).toBe(4);
    expect(combinedView[0]).toBe(1);
    expect(combinedView[1]).toBe(2);
    expect(combinedView[2]).toBe(3);
    expect(combinedView[3]).toBe(4);
  });

  test('should convert array buffer to string correctly', () => {
    const buffer = new ArrayBuffer(4);
    const view = new Uint16Array(buffer);
    view[0] = 'H'.charCodeAt(0);
    view[1] = 'i'.charCodeAt(0);

    const result = arraybuffer_to_str(buffer);
    expect(result).toBe('Hi');
  });

  test('should convert keycode to start scan correctly', () => {
    const result = keycode_to_start_scan('A'.charCodeAt(0), 'KeyA');
    expect(result).toBe(30);

    const resultF1 = keycode_to_start_scan(112, 'F1');
    expect(resultF1).toBe(59);
  });

  test('should convert keycode to end scan correctly', () => {
    const result = keycode_to_end_scan('A'.charCodeAt(0), 'KeyA');
    expect(result).toBe(30 | 0x80);

    const resultF1 = keycode_to_end_scan(112, 'F1');
    expect(resultF1).toBe(59 | 0x80);

    const resultHome = keycode_to_end_scan(36, 'Home');
    expect(resultHome).toBe((0xE0 | (71 << 8)) | 0x8000);
  });
});
