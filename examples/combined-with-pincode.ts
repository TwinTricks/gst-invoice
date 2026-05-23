/**
 * Combined usage: @twin.techies/india-pincode + @twin.techies/gst-invoice
 *
 * Realistic e-commerce checkout → invoice flow.
 *
 * NOTE: This example imports pincode lib from a relative path (sibling folder).
 * Once both packages are published, replace with:
 *   import { findByPincode } from '@twin.techies/india-pincode';
 *
 * Run with: bun run examples/combined-with-pincode.ts
 */

import { findByPincode } from '../../india-pincode/src/index';
import {
  computeInvoice,
  generateInvoicePDFToFile,
  getStateCode,
  isValidGSTIN,
} from '../src/index';
import { mkdir } from 'node:fs/promises';

await mkdir('examples/output', { recursive: true });

// ─────────────────────────────────────────────────────────────
// Step 1: User submits a checkout form
// ─────────────────────────────────────────────────────────────
const checkoutForm = {
  customerName: 'Brigade Software LLP',
  customerGSTIN: '29AAACB1234A1ZF',
  addressLine1: '12 Brigade Road, Block A',
  pincode: '560001',
  cart: [
    { name: 'Annual Software License', hsn: '998313', qty: 1, price: 60000, gst: 18 },
    { name: 'Onboarding & Setup', hsn: '998313', qty: 1, price: 15000, gst: 18 },
  ],
};

console.log('Checkout form received:', { name: checkoutForm.customerName, pincode: checkoutForm.pincode });

// ─────────────────────────────────────────────────────────────
// Step 2: Validate GSTIN
// ─────────────────────────────────────────────────────────────
if (!isValidGSTIN(checkoutForm.customerGSTIN)) {
  console.error('❌ Invalid GSTIN'); process.exit(1);
}
console.log('✓ GSTIN checksum valid');

// ─────────────────────────────────────────────────────────────
// Step 3: Auto-enrich address from pincode
// ─────────────────────────────────────────────────────────────
const location = findByPincode(checkoutForm.pincode);
if (!location) {
  console.error('❌ Pincode not in directory'); process.exit(1);
}
console.log(`✓ Pincode ${checkoutForm.pincode} → ${location.state}, ${location.district}`);

// ─────────────────────────────────────────────────────────────
// Step 4: Look up GST state code from state name
// ─────────────────────────────────────────────────────────────
const buyerStateCode = getStateCode(location.state);
if (!buyerStateCode) {
  console.error('❌ Could not map state to GST code'); process.exit(1);
}
console.log(`✓ State code: ${buyerStateCode}`);

// ─────────────────────────────────────────────────────────────
// Step 5: Build invoice (tax split happens automatically)
// ─────────────────────────────────────────────────────────────
const invoice = computeInvoice({
  meta: {
    invoiceNumber: `INV-${Date.now()}`,
    invoiceDate: new Date().toISOString().slice(0, 10),
  },
  seller: {
    name: 'Twintechies Pvt Ltd',
    gstin: '27AAPFU0939F1ZV',
    stateCode: '27',
    address: { line1: 'Plot 42, Hinjewadi Phase 2', city: 'Pune', state: 'Maharashtra', pincode: '411057' },
    email: 'billing@twintechies.com',
  },
  buyer: {
    name: checkoutForm.customerName,
    gstin: checkoutForm.customerGSTIN,
    stateCode: buyerStateCode,
    address: {
      line1: checkoutForm.addressLine1,
      city: location.offices[0]?.city ?? location.district,
      state: location.state,
      pincode: location.pincode,
    },
  },
  items: checkoutForm.cart.map((c) => ({
    description: c.name,
    hsn: c.hsn,
    quantity: c.qty,
    rate: c.price,
    gstRate: c.gst,
  })),
});

console.log('\n--- Invoice computed ---');
console.log(`Buyer in:       ${location.state} (state code ${buyerStateCode})`);
console.log(`Tax type:       ${invoice.isInterState ? 'IGST (inter-state)' : 'CGST + SGST (intra-state)'}`);
console.log(`Taxable value:  ₹${invoice.totals.taxableValue}`);
console.log(`Tax amount:     ₹${invoice.totals.totalTax}`);
console.log(`Grand total:    ₹${invoice.totals.grandTotal}`);

// ─────────────────────────────────────────────────────────────
// Step 6: Generate the PDF
// ─────────────────────────────────────────────────────────────
const path = 'examples/output/combined-checkout-invoice.pdf';
await generateInvoicePDFToFile(invoice, path, { template: 'corporate' });
console.log(`\n✓ PDF written: ${path}`);
