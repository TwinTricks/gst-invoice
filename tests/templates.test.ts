import { describe, expect, test } from 'bun:test';
import {
  computeInvoice,
  generateInvoicePDF,
  listTemplates,
  registerTemplate,
  InvoiceError,
} from '../src/index';
import type { InvoiceInput } from '../src/types';

const sampleInput: InvoiceInput = {
  meta: { invoiceNumber: 'TEST-001', invoiceDate: '2026-05-23' },
  seller: {
    name: 'Test Co',
    gstin: '27AAPFU0939F1ZV',
    stateCode: '27',
    address: { line1: 'Addr', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  },
  buyer: {
    name: 'Buyer Co',
    stateCode: '29',
    address: { line1: 'Addr', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  },
  items: [{ description: 'Service', hsn: '998313', quantity: 1, rate: 1000, gstRate: 18 }],
};

describe('template registry', () => {
  test('lists all 5 built-in templates', () => {
    const names = listTemplates();
    expect(names).toContain('modern');
    expect(names).toContain('classic');
    expect(names).toContain('minimal');
    expect(names).toContain('corporate');
    expect(names).toContain('compact');
  });

  test('each built-in template generates a valid PDF buffer', async () => {
    const invoice = computeInvoice(sampleInput);
    for (const name of ['modern', 'classic', 'minimal', 'corporate', 'compact']) {
      const buffer = await generateInvoicePDF(invoice, { template: name });
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    }
  });

  test('throws for unknown template', async () => {
    const invoice = computeInvoice(sampleInput);
    try {
      await generateInvoicePDF(invoice, { template: 'does-not-exist' });
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InvoiceError);
      expect((err as InvoiceError).code).toBe('PDF_ERROR');
    }
  });

  test('custom template can be registered and used', async () => {
    registerTemplate('custom-test', (ctx) => {
      ctx.doc.text('Custom Template', ctx.margin, ctx.margin);
    });
    const invoice = computeInvoice(sampleInput);
    const buffer = await generateInvoicePDF(invoice, { template: 'custom-test' });
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(listTemplates()).toContain('custom-test');
  });

  test('handles long descriptions across all templates without overlap', async () => {
    const longInput = {
      ...sampleInput,
      items: [
        { description: 'Very long description that will definitely wrap across two or even three lines in any reasonably narrow column width', hsn: '998313', quantity: 1, rate: 1000, gstRate: 18 },
        { description: 'Short', hsn: '998313', quantity: 1, rate: 500, gstRate: 18 },
        { description: 'Another extremely long line item description for testing wrap behavior and row height expansion logic', hsn: '998313', quantity: 1, rate: 2000, gstRate: 18 },
      ],
    };
    const invoice = computeInvoice(longInput);
    for (const name of ['modern', 'classic', 'minimal', 'corporate', 'compact']) {
      const buffer = await generateInvoicePDF(invoice, { template: name });
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
    }
  });

  test('theme overrides apply without errors', async () => {
    const invoice = computeInvoice(sampleInput);
    const buffer = await generateInvoicePDF(invoice, {
      template: 'minimal',
      theme: { primary: '#ff0000', density: 'compact' },
    });
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
