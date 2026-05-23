import { computeInvoice, generateInvoicePDFToFile, listTemplates, toEInvoiceJSON } from './src/index';
import { writeFile, mkdir } from 'node:fs/promises';

console.log('=== gst-invoice multi-template smoke test ===\n');

const invoice = computeInvoice({
  meta: {
    invoiceNumber: 'INV-2026-001',
    invoiceDate: '2026-05-23',
    dueDate: '2026-06-22',
  },
  seller: {
    name: 'Twintechies Pvt Ltd',
    gstin: '27AAPFU0939F1ZV',
    stateCode: '27',
    address: { line1: 'Plot 42, Hinjewadi Phase 2', city: 'Pune', state: 'Maharashtra', pincode: '411057' },
    email: 'billing@twintechies.com',
    phone: '+91 98765 43210',
  },
  buyer: {
    name: 'Brigade Software LLP',
    gstin: '29AAACB1234A1ZF',
    stateCode: '29',
    address: { line1: '12 Brigade Road', line2: 'Block A, 4th Floor', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
    email: 'accounts@brigadesoft.in',
  },
  items: [
    { description: 'Custom Software Development', hsn: '998313', quantity: 80, unit: 'HRS', rate: 2500, gstRate: 18 },
    { description: 'Premium Support (Monthly)', hsn: '998313', quantity: 1, unit: 'MO', rate: 15000, gstRate: 18, discount: 1500 },
    { description: 'On-site Training Workshop', hsn: '999293', quantity: 2, unit: 'DAY', rate: 8000, gstRate: 18 },
  ],
  notes: 'Payment due within 30 days. NEFT to A/c 12345678901 IFSC HDFC0000123.',
  termsAndConditions: 'All disputes subject to Pune jurisdiction. E. & O. E.',
});

await mkdir('samples', { recursive: true });

const templates = listTemplates();
console.log(`Available templates: ${templates.join(', ')}\n`);

for (const t of templates) {
  const path = `samples/invoice-${t}.pdf`;
  await generateInvoicePDFToFile(invoice, path, { template: t });
  console.log(`  ✓ ${path}`);
}

console.log('\nGenerating themed variant (green minimal):');
await generateInvoicePDFToFile(invoice, 'samples/invoice-minimal-green.pdf', {
  template: 'minimal',
  theme: { primary: '#065f46', accent: '#10b981' },
});
console.log('  ✓ samples/invoice-minimal-green.pdf');

console.log('\nGenerating compact dense variant:');
await generateInvoicePDFToFile(invoice, 'samples/invoice-modern-compact.pdf', {
  template: 'modern',
  theme: { density: 'compact', primary: '#7c3aed' },
});
console.log('  ✓ samples/invoice-modern-compact.pdf');

console.log('\nExporting e-invoice JSON:');
await writeFile('samples/einvoice.json', JSON.stringify(toEInvoiceJSON(invoice), null, 2));
console.log('  ✓ samples/einvoice.json');

console.log('\nGenerating stress-test (very long descriptions):');
const stressInvoice = computeInvoice({
  meta: { invoiceNumber: 'STRESS-001', invoiceDate: '2026-05-23' },
  seller: invoice.seller,
  buyer: invoice.buyer,
  items: [
    { description: 'Enterprise-grade custom software development including full-stack web application, API design, database architecture, and CI/CD pipeline setup', hsn: '998313', quantity: 120, unit: 'HRS', rate: 3500, gstRate: 18 },
    { description: 'Short item', hsn: '998313', quantity: 1, rate: 500, gstRate: 18 },
    { description: 'Another lengthy description testing how the row layout adapts when wrapping is required across multiple cells', hsn: '999293', quantity: 5, rate: 2000, gstRate: 18 },
    { description: 'Premium 24x7 support package with dedicated account manager and quarterly business reviews', hsn: '998313', quantity: 12, unit: 'MO', rate: 8500, gstRate: 18 },
  ],
});
for (const t of templates) {
  await generateInvoicePDFToFile(stressInvoice, `samples/stress-${t}.pdf`, { template: t });
  console.log(`  ✓ samples/stress-${t}.pdf`);
}

console.log('\n✓ All sample PDFs generated successfully');
