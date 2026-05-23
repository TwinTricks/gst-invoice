import { describe, expect, test } from 'bun:test';
import { isValidGSTIN, isValidHSN, isValidPincode, isValidStateCode, extractStateCodeFromGSTIN } from '../src/validate';

describe('isValidGSTIN', () => {
  test('accepts a valid GSTIN with correct checksum', () => {
    expect(isValidGSTIN('27AAPFU0939F1ZV')).toBe(true);
  });

  test('rejects GSTIN with wrong checksum', () => {
    expect(isValidGSTIN('27AAPFU0939F1ZX')).toBe(false);
  });

  test('rejects malformed GSTIN', () => {
    expect(isValidGSTIN('INVALID')).toBe(false);
    expect(isValidGSTIN('')).toBe(false);
    expect(isValidGSTIN('27AAPFU0939F1Z')).toBe(false);
  });

  test('rejects GSTIN with invalid state code', () => {
    expect(isValidGSTIN('00AAPFU0939F1ZV')).toBe(false);
  });
});

describe('extractStateCodeFromGSTIN', () => {
  test('extracts valid state code', () => {
    expect(extractStateCodeFromGSTIN('27AAPFU0939F1ZV')).toBe('27');
  });

  test('returns null for invalid state code', () => {
    expect(extractStateCodeFromGSTIN('00AAPFU0939F1ZV')).toBeNull();
  });
});

describe('isValidHSN', () => {
  test('accepts 4-8 digit HSN codes', () => {
    expect(isValidHSN('1234')).toBe(true);
    expect(isValidHSN('12345678')).toBe(true);
    expect(isValidHSN('998313')).toBe(true);
  });

  test('rejects HSN with non-numeric characters', () => {
    expect(isValidHSN('12A4')).toBe(false);
    expect(isValidHSN('')).toBe(false);
    expect(isValidHSN('123')).toBe(false);
  });
});

describe('isValidPincode', () => {
  test('accepts valid pincodes', () => {
    expect(isValidPincode('110001')).toBe(true);
  });

  test('rejects invalid pincodes', () => {
    expect(isValidPincode('010001')).toBe(false);
    expect(isValidPincode('abc')).toBe(false);
  });
});

describe('isValidStateCode', () => {
  test('accepts known codes', () => {
    expect(isValidStateCode('27')).toBe(true);
    expect(isValidStateCode('29')).toBe(true);
  });

  test('rejects unknown codes', () => {
    expect(isValidStateCode('00')).toBe(false);
    expect(isValidStateCode('99')).toBe(true);
  });
});
