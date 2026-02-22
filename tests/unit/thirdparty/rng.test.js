import { SecureRandom } from '../../../src/spice/thirdparty/rng.ts';

describe('rng', () => {
  test('should create a new SecureRandom instance', () => {
    const rng = new SecureRandom();
    expect(rng).toBeDefined();
    expect(typeof rng.nextBytes).toBe('function');
  });

  test('should generate random bytes', () => {
    const rng = new SecureRandom();
    const bytes = new Array(10);
    rng.nextBytes(bytes);
    expect(bytes).toBeDefined();
    expect(bytes.length).toBe(10);
    bytes.forEach(byte => {
      expect(byte).toBeGreaterThanOrEqual(0);
      expect(byte).toBeLessThanOrEqual(255);
    });
  });

  test('should generate different sequences of random bytes', () => {
    const rng1 = new SecureRandom();
    const rng2 = new SecureRandom();
    const bytes1 = new Array(10);
    const bytes2 = new Array(10);
    rng1.nextBytes(bytes1);
    rng2.nextBytes(bytes2);
    expect(bytes1).not.toEqual(bytes2);
  });

  test('should generate consistent length of random bytes', () => {
    const rng = new SecureRandom();
    const lengths = [1, 5, 10, 20, 50];
    lengths.forEach(length => {
      const bytes = new Array(length);
      rng.nextBytes(bytes);
      expect(bytes.length).toBe(length);
    });
  });
});
