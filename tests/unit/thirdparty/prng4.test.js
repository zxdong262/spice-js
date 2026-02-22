import { prng_newstate, rng_psize } from '../../../src/spice/thirdparty/prng4.ts';

describe('prng4', () => {
  test('should export correct rng_psize', () => {
    expect(rng_psize).toBe(256);
  });

  test('should create a new Arcfour instance', () => {
    const prng = prng_newstate();
    expect(prng).toBeDefined();
    expect(prng.i).toBe(0);
    expect(prng.j).toBe(0);
    expect(prng.S).toBeDefined();
    expect(Array.isArray(prng.S)).toBe(true);
  });

  test('should initialize Arcfour with a key', () => {
    const prng = prng_newstate();
    const key = [1, 2, 3, 4, 5];
    prng.init(key);
    expect(prng.i).toBe(0);
    expect(prng.j).toBe(0);
    expect(prng.S).toBeDefined();
    expect(prng.S.length).toBe(256);
  });

  test('should generate random numbers', () => {
    const prng = prng_newstate();
    const key = [1, 2, 3, 4, 5];
    prng.init(key);

    const values = new Set();
    for (let i = 0; i < 100; i++) {
      const value = prng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(255);
      values.add(value);
    }

    expect(values.size).toBeGreaterThan(1);
  });

  test('should generate consistent sequence with same key', () => {
    const prng1 = prng_newstate();
    const prng2 = prng_newstate();
    const key = [1, 2, 3, 4, 5];

    prng1.init(key);
    prng2.init(key);

    for (let i = 0; i < 100; i++) {
      expect(prng1.next()).toBe(prng2.next());
    }
  });
});
