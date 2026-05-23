/**
 * @twin.techies/gst-invoice — full usage examples
 *
 * Run with: bun run examples/usage.ts
 * Generated PDFs land in ./examples/output/
 */

import { mkdir } from 'node:fs/promises';
import {
  computeInvoice,
  generateInvoicePDF,
  generateInvoicePDFToFile,
  registerTemplate,
  listTemplates,
  toEInvoiceJSON,
  isValidGSTIN,
  extractStateCodeFromGSTIN,
  isValidHSN,
  getStateCode,
  getStateName,
  amountInWordsINR,
  InvoiceError,
  type InvoiceInput,
} from '../src/index';

function section(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(' ' + title);
  console.log('='.repeat(60));
}

await mkdir('examples/output', { recursive: true });

const sellerSample = {
  name: 'Twintechies Pvt Ltd',
  gstin: '27AAPFU0939F1ZV',
  stateCode: '27',
  address: { line1: 'Plot 42, Hinjewadi Phase 2', city: 'Pune', state: 'Maharashtra', pincode: '411057' },
  email: 'billing@twintechies.com',
};

// ─────────────────────────────────────────────────────────────
section('1. Intra-state invoice (CGST + SGST)');
// ─────────────────────────────────────────────────────────────
const intraInput: InvoiceInput = {
  meta: { invoiceNumber: 'INV-2026-001', invoiceDate: '2026-05-23' },
  seller: sellerSample,
  buyer: {
    name: 'Mumbai Buyer Co',
    gstin: '27AAACM1234A1Z2',
    stateCode: '27',  // same state → CGST + SGST
    address: { line1: 'MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  },
  items: [
    { description: 'Consulting', hsn: '998311', quantity: 10, unit: 'HRS', rate: 5000, gstRate: 18 },
  ],
};
const intra = computeInvoice(intraInput);
console.log(`isInterState: ${intra.isInterState}`);
console.log(`Taxable:      ₹${intra.totals.taxableValue}`);
console.log(`CGST:         ₹${intra.totals.cgst}`);
console.log(`SGST:         ₹${intra.totals.sgst}`);
console.log(`IGST:         ₹${intra.totals.igst}`);
console.log(`Grand Total:  ₹${intra.totals.grandTotal}`);

// ─────────────────────────────────────────────────────────────
section('2. Inter-state invoice (IGST)');
// ─────────────────────────────────────────────────────────────
const interInput: InvoiceInput = {
  meta: { invoiceNumber: 'INV-2026-002', invoiceDate: '2026-05-23', dueDate: '2026-06-22' },
  seller: sellerSample,
  buyer: {
    name: 'Brigade Software LLP',
    gstin: '29AAACB1234A1ZF',
    stateCode: '29',  // Karnataka → IGST
    address: { line1: '12 Brigade Road', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  },
  items: [
    { description: 'Custom Software Development', hsn: '998313', quantity: 80, unit: 'HRS', rate: 2500, gstRate: 18 },
    { description: 'Premium Support', hsn: '998313', quantity: 1, unit: 'MO', rate: 15000, gstRate: 18, discount: 1500 },
    { description: 'On-site Training', hsn: '999293', quantity: 2, unit: 'DAY', rate: 8000, gstRate: 18 },
  ],
  notes: 'Payment due within 30 days.',
  termsAndConditions: 'All disputes subject to Pune jurisdiction.',
};
const inter = computeInvoice(interInput);
console.log(`isInterState: ${inter.isInterState}`);
console.log(`Taxable:      ₹${inter.totals.taxableValue}`);
console.log(`IGST:         ₹${inter.totals.igst}`);
console.log(`Grand Total:  ₹${inter.totals.grandTotal}`);

// ─────────────────────────────────────────────────────────────
section('3. Generate PDF — all 5 templates');
// ─────────────────────────────────────────────────────────────
const templates = listTemplates();
console.log(`Available templates: ${templates.join(', ')}\n`);
for (const t of templates) {
  await generateInvoicePDFToFile(inter, `examples/output/invoice-${t}.pdf`, { template: t });
  console.log(`  ✓ examples/output/invoice-${t}.pdf`);
}

// ─────────────────────────────────────────────────────────────
section('4. Theming — same template, different brand colors');
// ─────────────────────────────────────────────────────────────
await generateInvoicePDFToFile(inter, 'examples/output/themed-green.pdf', {
  template: 'modern',
  theme: { primary: '#065f46', accent: '#10b981' },
});
console.log('  ✓ themed-green.pdf  (forest green)');

await generateInvoicePDFToFile(inter, 'examples/output/themed-purple.pdf', {
  template: 'corporate',
  theme: { primary: '#6b21a8', accent: '#a855f7' },
});
console.log('  ✓ themed-purple.pdf (royal purple)');

await generateInvoicePDFToFile(inter, 'examples/output/themed-compact.pdf', {
  template: 'modern',
  theme: { density: 'compact', primary: '#dc2626' },
});
console.log('  ✓ themed-compact.pdf (red + dense layout)');

// ─────────────────────────────────────────────────────────────
section('5. Generate PDF as Buffer (for HTTP responses)');
// ─────────────────────────────────────────────────────────────
const buffer = await generateInvoicePDF(inter, { template: 'minimal' });
console.log(`Buffer size: ${(buffer.length / 1024).toFixed(1)} KB`);
console.log(`Magic bytes: ${buffer.subarray(0, 4).toString()} (valid PDF)`);
console.log('Use this directly in express: res.contentType("application/pdf").send(buffer)');

// ─────────────────────────────────────────────────────────────
section('6. Validate GSTIN (with real checksum verification)');
// ─────────────────────────────────────────────────────────────
const cases = ['27AAPFU0939F1ZV', '27AAPFU0939F1ZX', 'INVALID', '00AAPFU0939F1ZV'];
cases.forEach((g) => {
  const valid = isValidGSTIN(g);
  const state = extractStateCodeFromGSTIN(g);
  console.log(`${valid ? '✓' : '✗'} ${g.padEnd(20)} ${state ? `state code: ${state}` : ''}`);
});

// ─────────────────────────────────────────────────────────────
section('7. Validate HSN/SAC codes');
// ─────────────────────────────────────────────────────────────
['8471', '998313', '12345678', 'abc', '12'].forEach((h) => {
  console.log(`${isValidHSN(h) ? '✓' : '✗'} HSN "${h}"`);
});

// ─────────────────────────────────────────────────────────────
section('8. State code ↔ name conversion');
// ─────────────────────────────────────────────────────────────
console.log(`getStateName('27'):           ${getStateName('27')}`);
console.log(`getStateName('29'):           ${getStateName('29')}`);
console.log(`getStateCode('Maharashtra'):  ${getStateCode('Maharashtra')}`);
console.log(`getStateCode('Karnataka'):    ${getStateCode('Karnataka')}`);

// ─────────────────────────────────────────────────────────────
section('9. Amount in words (Indian numbering)');
// ─────────────────────────────────────────────────────────────
[100, 1500, 125000, 2360, 10000000, 12345678.50].forEach((amt) => {
  console.log(`₹${amt.toString().padStart(12)} → ${amountInWordsINR(amt)}`);
});

// ─────────────────────────────────────────────────────────────
section('10. Export e-invoice JSON (NIC IRP v1.1 schema)');
// ─────────────────────────────────────────────────────────────
const eInvoice = toEInvoiceJSON(inter);
console.log(`Schema:       v${eInvoice.Version}`);
console.log(`Doc number:   ${eInvoice.DocDtls.No}`);
console.log(`Doc date:     ${eInvoice.DocDtls.Dt}`);
console.log(`Items:        ${eInvoice.ItemList.length}`);
console.log(`Total value:  ₹${eInvoice.ValDtls.TotInvVal}`);
console.log('\n(Upload this JSON to einvoice1.gst.gov.in or through your GSP)');

// ─────────────────────────────────────────────────────────────
section('11. Register a custom template');
// ─────────────────────────────────────────────────────────────
registerTemplate('thermal-receipt', (ctx) => {
  const { doc, invoice, margin, width } = ctx;
  doc.font('Courier-Bold').fontSize(14).text(invoice.seller.name, margin, margin, { width, align: 'center' });
  doc.font('Courier').fontSize(9).text('-'.repeat(60), margin, doc.y, { width, align: 'center' });
  doc.text(`Invoice: ${invoice.meta.invoiceNumber}`, { width, align: 'center' });
  doc.text(`Date:    ${invoice.meta.invoiceDate}`, { width, align: 'center' });
  doc.text('-'.repeat(60), { width, align: 'center' });
  doc.moveDown();
  invoice.items.forEach((i) => {
    doc.text(`${i.description}`, margin);
    doc.text(`  ${i.quantity} x ${i.rate} = ${i.lineTotal}`, margin);
  });
  doc.moveDown();
  doc.text('-'.repeat(60), { width, align: 'center' });
  doc.font('Courier-Bold').text(`TOTAL: INR ${invoice.totals.grandTotal}`, margin, doc.y, { width, align: 'center' });
});

await generateInvoicePDFToFile(inter, 'examples/output/custom-receipt.pdf', { template: 'thermal-receipt' });
console.log('  ✓ custom-receipt.pdf (thermal-printer-style template)');

// ─────────────────────────────────────────────────────────────
section('12. Error handling');
// ─────────────────────────────────────────────────────────────
try {
  computeInvoice({
    meta: { invoiceNumber: 'BAD', invoiceDate: '2026-05-23' },
    seller: { ...sellerSample, stateCode: '00' },  // invalid
    buyer: sellerSample,
    items: [{ description: 'x', hsn: '998313', quantity: 1, rate: 100, gstRate: 18 }],
  });
} catch (err) {
  if (err instanceof InvoiceError) {
    console.log(`Caught InvoiceError [${err.code}]: ${err.message}`);
  }
}

try {
  await generateInvoicePDF(inter, { template: 'does-not-exist' });
} catch (err) {
  if (err instanceof InvoiceError) {
    console.log(`Caught InvoiceError [${err.code}]: ${err.message}`);
  }
}

console.log('\n' + '─'.repeat(60));
console.log(' ✓ All examples ran successfully');
console.log(' → Open examples/output/ to view generated PDFs');
console.log('─'.repeat(60));
