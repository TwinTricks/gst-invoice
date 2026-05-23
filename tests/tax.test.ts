import { describe, expect, test } from 'bun:test';
import { computeInvoice, computeLine, amountInWordsINR, round2 } from '../src/tax';
import type { InvoiceInput, LineItem } from '../src/types';

const baseSeller = {
  name: 'Acme Pvt Ltd',
  gstin: '27AAPFU0939F1ZV',
  stateCode: '27',
  address: { line1: '1 MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
};

const baseItem: LineItem = {
  description: 'Widget',
  hsn: '8471',
  quantity: 2,
  rate: 1000,
  gstRate: 18,
};

describe('computeLine', () => {
  test('splits tax into CGST + SGST for intra-state', () => {
    const line = computeLine(baseItem, false);
    expect(line.taxableValue).toBe(2000);
    expect(line.cgst).toBe(180);
    expect(line.sgst).toBe(180);
    expect(line.igst).toBe(0);
    expect(line.lineTotal).toBe(2360);
  });

  test('applies IGST for inter-state', () => {
    const line = computeLine(baseItem, true);
    expect(line.cgst).toBe(0);
    expect(line.sgst).toBe(0);
    expect(line.igst).toBe(360);
    expect(line.lineTotal).toBe(2360);
  });

  test('applies discount before tax', () => {
    const line = computeLine({ ...baseItem, discount: 200 }, false);
    expect(line.taxableValue).toBe(1800);
    expect(line.cgst).toBe(162);
    expect(line.sgst).toBe(162);
  });

  test('rejects invalid HSN', () => {
    expect(() => computeLine({ ...baseItem, hsn: 'abc' }, false)).toThrow();
  });

  test('rejects zero or negative quantity', () => {
    expect(() => computeLine({ ...baseItem, quantity: 0 }, false)).toThrow();
  });
});

describe('computeInvoice', () => {
  test('detects intra-state when buyer and seller share state', () => {
    const input: InvoiceInput = {
      meta: { invoiceNumber: 'INV-001', invoiceDate: '2026-05-23' },
      seller: baseSeller,
      buyer: {
        name: 'Buyer Co',
        gstin: '27AAACB1234A1ZB',
        stateCode: '27',
        address: { line1: '2 Park St', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      },
      items: [baseItem],
    };
    const result = computeInvoice(input);
    expect(result.isInterState).toBe(false);
    expect(result.totals.cgst).toBe(180);
    expect(result.totals.sgst).toBe(180);
    expect(result.totals.igst).toBe(0);
    expect(result.totals.grandTotal).toBe(2360);
  });

  test('detects inter-state when codes differ', () => {
    const input: InvoiceInput = {
      meta: { invoiceNumber: 'INV-002', invoiceDate: '2026-05-23' },
      seller: baseSeller,
      buyer: {
        name: 'Karnataka Buyer',
        stateCode: '29',
        address: { line1: '3 Brigade Rd', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
      },
      items: [baseItem],
    };
    const result = computeInvoice(input);
    expect(result.isInterState).toBe(true);
    expect(result.totals.igst).toBe(360);
    expect(result.totals.cgst).toBe(0);
  });

  test('sums totals across multiple line items', () => {
    const input: InvoiceInput = {
      meta: { invoiceNumber: 'INV-003', invoiceDate: '2026-05-23' },
      seller: baseSeller,
      buyer: {
        name: 'Buyer Co',
        stateCode: '27',
        address: { line1: 'x', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      },
      items: [
        { ...baseItem, rate: 1000 },
        { ...baseItem, rate: 500, quantity: 1, gstRate: 12 },
      ],
    };
    const result = computeInvoice(input);
    expect(result.totals.taxableValue).toBe(2500);
    expect(result.items).toHaveLength(2);
  });

  test('rejects invalid seller state code', () => {
    const input: InvoiceInput = {
      meta: { invoiceNumber: 'INV-004', invoiceDate: '2026-05-23' },
      seller: { ...baseSeller, stateCode: '00' },
      buyer: {
        name: 'Buyer Co',
        stateCode: '27',
        address: { line1: 'x', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
      },
      items: [baseItem],
    };
    expect(() => computeInvoice(input)).toThrow();
  });
});

describe('round2', () => {
  test('rounds half-up to 2 decimals', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.345)).toBe(2.35);
  });
});

describe('amountInWordsINR', () => {
  test('converts simple amounts', () => {
    expect(amountInWordsINR(0)).toBe('Zero Rupees Only');
    expect(amountInWordsINR(1)).toBe('One Rupees Only');
    expect(amountInWordsINR(2360)).toBe('Two Thousand Three Hundred Sixty Rupees Only');
  });

  test('handles lakhs and crores (Indian numbering)', () => {
    expect(amountInWordsINR(100000)).toBe('One Lakh Rupees Only');
    expect(amountInWordsINR(10000000)).toBe('One Crore Rupees Only');
    expect(amountInWordsINR(125000)).toBe('One Lakh Twenty Five Thousand Rupees Only');
  });

  test('includes paise', () => {
    expect(amountInWordsINR(100.5)).toBe('One Hundred Rupees and Fifty Paise Only');
  });
});
