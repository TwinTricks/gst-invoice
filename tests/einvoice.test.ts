import { describe, expect, test } from 'bun:test';
import { computeInvoice } from '../src/tax';
import { toEInvoiceJSON } from '../src/einvoice';
import type { InvoiceInput } from '../src/types';

const input: InvoiceInput = {
  meta: { invoiceNumber: 'INV-100', invoiceDate: '2026-05-23' },
  seller: {
    name: 'Acme Pvt Ltd',
    gstin: '27AAPFU0939F1ZV',
    stateCode: '27',
    address: { line1: '1 MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  },
  buyer: {
    name: 'Karnataka Buyer',
    gstin: '29AAACB1234A1ZF',
    stateCode: '29',
    address: { line1: '3 Brigade Rd', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  },
  items: [
    { description: 'Widget', hsn: '8471', quantity: 2, rate: 1000, gstRate: 18 },
  ],
};

describe('toEInvoiceJSON', () => {
  test('produces NIC-compatible schema fields', () => {
    const result = computeInvoice(input);
    const json = toEInvoiceJSON(result);

    expect(json.Version).toBe('1.1');
    expect(json.TranDtls.TaxSch).toBe('GST');
    expect(json.DocDtls.No).toBe('INV-100');
    expect(json.DocDtls.Dt).toBe('23/05/2026');
    expect(json.SellerDtls.Gstin).toBe('27AAPFU0939F1ZV');
    expect(json.SellerDtls.Stcd).toBe('27');
    expect(json.BuyerDtls.Pos).toBe('29');
    expect(json.ItemList).toHaveLength(1);
    expect(json.ItemList[0]!.IgstAmt).toBe(360);
    expect(json.ValDtls.TotInvVal).toBe(2360);
  });
});
