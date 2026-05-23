import { GST_STATE_CODES } from './state-codes';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const HSN_REGEX = /^[0-9]{4,8}$/;
const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function isValidGSTIN(gstin: string): boolean {
  if (!gstin || typeof gstin !== 'string') return false;
  const value = gstin.trim().toUpperCase();
  if (!GSTIN_REGEX.test(value)) return false;

  const stateCode = value.substring(0, 2);
  if (!GST_STATE_CODES[stateCode]) return false;

  return verifyGSTINChecksum(value);
}

function verifyGSTINChecksum(gstin: string): boolean {
  const factor = 2;
  const codePointBase = 36;
  let sum = 0;

  for (let i = 0; i < 14; i++) {
    const char = gstin[i]!;
    const codePoint = GSTIN_CHARSET.indexOf(char);
    if (codePoint === -1) return false;
    const multiplier = i % 2 === 0 ? 1 : factor;
    const product = codePoint * multiplier;
    sum += Math.floor(product / codePointBase) + (product % codePointBase);
  }

  const expectedCheckDigit = (codePointBase - (sum % codePointBase)) % codePointBase;
  const actualCheckDigit = GSTIN_CHARSET.indexOf(gstin[14]!);

  return expectedCheckDigit === actualCheckDigit;
}

export function extractStateCodeFromGSTIN(gstin: string): string | null {
  if (!gstin || gstin.length < 2) return null;
  const code = gstin.substring(0, 2);
  return GST_STATE_CODES[code] ? code : null;
}

export function isValidHSN(hsn: string): boolean {
  if (!hsn || typeof hsn !== 'string') return false;
  return HSN_REGEX.test(hsn.trim());
}

export function isValidPincode(pincode: string): boolean {
  if (!pincode || typeof pincode !== 'string') return false;
  return PINCODE_REGEX.test(pincode.trim());
}

export function isValidStateCode(code: string): boolean {
  return !!GST_STATE_CODES[code];
}
