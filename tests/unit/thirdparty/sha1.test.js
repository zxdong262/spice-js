import { hex_sha1, rstr_sha1 } from '../../../src/spice/thirdparty/sha1.ts';

describe('sha1', () => {
  test('should compute correct SHA1 for "abc"', () => {
    const result = hex_sha1('abc');
    expect(result).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
  });

  test('should compute correct SHA1 for empty string', () => {
    const result = hex_sha1('');
    expect(result).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709');
  });

  test('should compute correct SHA1 for longer string', () => {
    const result = hex_sha1('The quick brown fox jumps over the lazy dog');
    expect(result).toBe('2fd4e1c67a2d28fced849ee1bb76e7391b93eb12');
  });

  test('should return consistent results', () => {
    const str = 'test string for consistency';
    const result1 = hex_sha1(str);
    const result2 = hex_sha1(str);
    expect(result1).toBe(result2);
  });

  test('should work with rstr_sha1', () => {
    const result = rstr_sha1('test');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});
