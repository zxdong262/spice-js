import { Constants } from '../../src/spice/enums.ts';

describe('Constants', () => {
  test('should export all required constants', () => {
    expect(Constants).toBeDefined();
    expect(typeof Constants).toBe('object');
  });

  test('should have correct SPICE_MAGIC', () => {
    expect(Constants.SPICE_MAGIC).toBe('REDQ');
  });

  test('should have correct version constants', () => {
    expect(Constants.SPICE_VERSION_MAJOR).toBe(2);
    expect(Constants.SPICE_VERSION_MINOR).toBe(2);
  });

  test('should have correct link error constants', () => {
    expect(Constants.SPICE_LINK_ERR_OK).toBe(0);
    expect(Constants.SPICE_LINK_ERR_ERROR).toBe(1);
    expect(Constants.SPICE_LINK_ERR_INVALID_MAGIC).toBe(2);
    expect(Constants.SPICE_LINK_ERR_INVALID_DATA).toBe(3);
    expect(Constants.SPICE_LINK_ERR_VERSION_MISMATCH).toBe(4);
  });

  test('should have correct message constants', () => {
    expect(Constants.SPICE_MSG_MIGRATE).toBe(1);
    expect(Constants.SPICE_MSG_SET_ACK).toBe(3);
    expect(Constants.SPICE_MSG_PING).toBe(4);
  });

  test('should have correct channel constants', () => {
    expect(Constants.SPICE_CHANNEL_MAIN).toBe(1);
    expect(Constants.SPICE_CHANNEL_DISPLAY).toBe(2);
    expect(Constants.SPICE_CHANNEL_INPUTS).toBe(3);
    expect(Constants.SPICE_CHANNEL_CURSOR).toBe(4);
    expect(Constants.SPICE_CHANNEL_PLAYBACK).toBe(5);
  });

  test('should have correct image type constants', () => {
    expect(Constants.SPICE_IMAGE_TYPE_BITMAP).toBe(0);
    expect(Constants.SPICE_IMAGE_TYPE_QUIC).toBe(1);
    expect(Constants.SPICE_IMAGE_TYPE_LZ_PLT).toBe(100);
    expect(Constants.SPICE_IMAGE_TYPE_LZ_RGB).toBe(101);
  });

  test('should have correct audio constants', () => {
    expect(Constants.SPICE_AUDIO_DATA_MODE_RAW).toBe(1);
    expect(Constants.SPICE_AUDIO_DATA_MODE_CELT_0_5_1).toBe(2);
    expect(Constants.SPICE_AUDIO_DATA_MODE_OPUS).toBe(3);
  });

  test('should have correct capability constants', () => {
    expect(Constants.SPICE_COMMON_CAP_PROTOCOL_AUTH_SELECTION).toBe(0);
    expect(Constants.SPICE_COMMON_CAP_AUTH_SPICE).toBe(1);
    expect(Constants.SPICE_COMMON_CAP_AUTH_SASL).toBe(2);
    expect(Constants.SPICE_COMMON_CAP_MINI_HEADER).toBe(3);
  });

  test('should have correct mouse mode constants', () => {
    expect(Constants.SPICE_MOUSE_MODE_SERVER).toBe(1);
    expect(Constants.SPICE_MOUSE_MODE_CLIENT).toBe(2);
    expect(Constants.SPICE_MOUSE_MODE_MASK).toBe(3);
  });

  test('should have correct surface format constants', () => {
    expect(Constants.SPICE_SURFACE_FMT_INVALID).toBe(0);
    expect(Constants.SPICE_SURFACE_FMT_1_A).toBe(1);
    expect(Constants.SPICE_SURFACE_FMT_8_A).toBe(8);
    expect(Constants.SPICE_SURFACE_FMT_16_555).toBe(16);
    expect(Constants.SPICE_SURFACE_FMT_32_xRGB).toBe(32);
  });
});
