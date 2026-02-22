import { BigInteger } from '../../../src/spice/thirdparty/jsbn.ts';

describe('BigInteger', () => {
  test('should create a BigInteger from a number', () => {
    const bi = new BigInteger(12345);
    expect(bi).toBeDefined();
    expect(bi.toString(10)).toBe('12345');
  });

  test('should create a BigInteger from a string', () => {
    const bi = new BigInteger('12345', 10);
    expect(bi).toBeDefined();
    expect(bi.toString(10)).toBe('12345');
  });

  test('should create a BigInteger from a hex string', () => {
    const bi = new BigInteger('FFFF', 16);
    expect(bi).toBeDefined();
    expect(bi.toString(10)).toBe('65535');
  });

  test('should handle negative numbers', () => {
    const bi = new BigInteger('-12345', 10);
    expect(bi).toBeDefined();
    expect(bi.toString(10)).toBe('-12345');
  });

  test('should return correct string representation', () => {
    const bi = new BigInteger(12345);
    expect(bi.toString(10)).toBe('12345');
    expect(bi.toString(16)).toBe('3039');
  });

  test('should compare BigIntegers correctly', () => {
    const bi1 = new BigInteger(123);
    const bi2 = new BigInteger(456);
    const bi3 = new BigInteger(123);

    expect(bi1.compareTo(bi2)).toBeLessThan(0);
    expect(bi2.compareTo(bi1)).toBeGreaterThan(0);
    expect(bi1.compareTo(bi3)).toBe(0);
  });

  test('should return correct bit length', () => {
    const bi1 = new BigInteger(0);
    const bi2 = new BigInteger(1);
    const bi3 = new BigInteger(255);
    const bi4 = new BigInteger(256);

    expect(bi1.bitLength()).toBe(0);
    expect(bi2.bitLength()).toBe(1);
    expect(bi3.bitLength()).toBe(8);
    expect(bi4.bitLength()).toBe(9);
  });

  test('should compute modulus correctly', () => {
    const bi1 = new BigInteger(12345);
    const bi2 = new BigInteger(100);
    const result = bi1.mod(bi2);
    expect(result.toString(10)).toBe('45');
  });

  test('should compute modular exponentiation correctly', () => {
    const base = new BigInteger(2);
    const exponent = 3;
    const modulus = new BigInteger(5);
    const result = base.modPowInt(exponent, modulus);
    expect(result.toString(10)).toBe('3');

    const base2 = new BigInteger(3);
    const exponent2 = 4;
    const modulus2 = new BigInteger(7);
    const result2 = base2.modPowInt(exponent2, modulus2);
    expect(result2.toString(10)).toBe('4');
  });

  test('should handle zero correctly', () => {
    const zero = new BigInteger(0);
    expect(zero.toString(10)).toBe('0');
    expect(zero.bitLength()).toBe(0);

    const bi = new BigInteger(123);
    const result = bi.mod(zero);
    expect(result).toBeDefined();
  });

  test('should handle large numbers', () => {
    const largeStr = '123456789012345678901234567890';
    const bi = new BigInteger(largeStr, 10);
    expect(bi.toString(10)).toBe(largeStr);
  });
});
