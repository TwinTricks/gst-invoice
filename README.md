# @twin.techies/gst-invoice

[![npm](https://img.shields.io/npm/v/@twin.techies/gst-invoice.svg)](https://www.npmjs.com/package/@twin.techies/gst-invoice)
[![Live Demo](https://img.shields.io/badge/live%20demo-storybook-ff4785)](https://6a132a7cd42582454e1f297c-tfbgytflvw.chromatic.com/?path=/story/gst-invoice-invoice-builder--default)
[![Try on RunKit](https://badge.runkitcdn.com/@twin.techies/gst-invoice.svg)](https://npm.runkit.com/@twin.techies/gst-invoice)

Generate **GST-compliant invoices for India** — automatic CGST/SGST vs IGST tax calculation, PDF rendering with 5 templates, and e-invoice (NIC schema v1.1) JSON export.

## 🚀 Try it live (no install)

**[👉 Interactive playground on Storybook](https://6a132a7cd42582454e1f297c-tfbgytflvw.chromatic.com/?path=/story/gst-invoice-invoice-builder--default)** — build invoices, validate GSTINs, see tax math live, browse 5 templates.

Stories available:
- [GSTIN Validator](https://6a132a7cd42582454e1f297c-tfbgytflvw.chromatic.com/?path=/story/gst-invoice-gstin-validator--default) — real checksum validation
- [Tax Computation](https://6a132a7cd42582454e1f297c-tfbgytflvw.chromatic.com/?path=/story/gst-invoice-tax-computation--default) — live CGST/SGST vs IGST split
- [Invoice Builder](https://6a132a7cd42582454e1f297c-tfbgytflvw.chromatic.com/?path=/story/gst-invoice-invoice-builder--default) — full form → HTML preview
- [Template Gallery](https://6a132a7cd42582454e1f297c-tfbgytflvw.chromatic.com/?path=/story/gst-invoice-template-gallery--default) — visual mocks of all 5 PDF templates
- [E-Invoice JSON](https://6a132a7cd42582454e1f297c-tfbgytflvw.chromatic.com/?path=/story/gst-invoice-e-invoice-json-export--default) — NIC IRP v1.1 schema export

> The Storybook is a **browser preview** — PDF download is disabled there because PDF generation requires Node.js. The full library generates real PDFs in your own Next.js / Node app — copy the example code from any story.

Or **[open a RunKit notebook →](https://npm.runkit.com/@twin.techies/gst-invoice)** and paste this to see the tax math instantly:

```js
const { computeInvoice, toEInvoiceJSON, amountInWordsINR } = require('@twin.techies/gst-invoice');

const invoice = computeInvoice({
  meta: { invoiceNumber: 'INV-001', invoiceDate: '2026-05-23' },
  seller: {
    name: 'My Company', gstin: '27AAPFU0939F1ZV', stateCode: '27',
    address: { line1: 'Pune Office', city: 'Pune', state: 'Maharashtra', pincode: '411057' },
  },
  buyer: {
    name: 'Client Co', gstin: '29AAACB1234A1ZF', stateCode: '29',
    address: { line1: 'BLR Office', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  },
  items: [
    { description: 'Software License', hsn: '998313', quantity: 10, rate: 5000, gstRate: 18 },
  ],
});

invoice.totals;        // { taxableValue: 50000, igst: 9000, grandTotal: 59000, ... }
invoice.isInterState;  // true → IGST applied (different states)
amountInWordsINR(invoice.totals.grandTotal);  // "Fifty Nine Thousand Rupees Only"
```

For **PDF generation**, open a **[full StackBlitz Node sandbox →](https://stackblitz.com/fork/node?title=gst-invoice-demo)** (WebContainer supports filesystem):

```bash
npm install @twin.techies/gst-invoice
```

```js
const { computeInvoice, generateInvoicePDFToFile } = require('@twin.techies/gst-invoice');
// build invoice object as above
await generateInvoicePDFToFile(invoice, 'invoice.pdf', { template: 'corporate' });
```

> RunKit doesn't support writing files, so PDF generation only works in StackBlitz/local. The tax math, validators, and e-invoice JSON export work everywhere.

## Features

- **5 built-in invoice templates**: `modern`, `classic`, `minimal`, `corporate`, `compact`
- **Full theming system**: customize colors, fonts, density — unlimited variations from any template
- **Custom templates**: register your own via `registerTemplate()`
- **Automatic tax split** — CGST + SGST for intra-state, IGST for inter-state, decided from state codes
- **GSTIN validator** with checksum verification
- **HSN/SAC, pincode, state code validation**
- **PDF generation** via PDFKit
- **E-invoice JSON export** matching the NIC IRP schema v1.1
- **Amount in words** (Indian numbering: lakh / crore)
- **Discount, cess, round-off** handled correctly
- TypeScript-first, ESM + CJS dual build

## Install

```bash
npm install @twin.techies/gst-invoice
# or
bun add @twin.techies/gst-invoice
```

## Quick start

```ts
import {
  computeInvoice,
  generateInvoicePDFToFile,
  toEInvoiceJSON,
} from '@twin.techies/gst-invoice';

const invoice = computeInvoice({
  meta: {
    invoiceNumber: 'INV-2026-001',
    invoiceDate: '2026-05-23',
    dueDate: '2026-06-22',
  },
  seller: {
    name: 'Acme Pvt Ltd',
    gstin: '27AAPFU0939F1ZV',
    stateCode: '27',
    address: {
      line1: '1 MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
    email: 'billing@acme.in',
  },
  buyer: {
    name: 'Karnataka Buyers LLP',
    gstin: '29AAACB1234A1ZF',
    stateCode: '29',
    address: {
      line1: '3 Brigade Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
    },
  },
  items: [
    {
      description: 'Custom Widget',
      hsn: '8471',
      quantity: 10,
      unit: 'PCS',
      rate: 1000,
      gstRate: 18,
    },
  ],
});

// Inspect the computed totals
console.log(invoice.totals);
// { taxableValue: 10000, igst: 1800, grandTotal: 11800, ... }

// Render to PDF
await generateInvoicePDFToFile(invoice, './invoice.pdf');

// Export e-invoice JSON for IRP upload
const eInvoice = toEInvoiceJSON(invoice);
```

## Tax logic

The library automatically decides the tax split based on **GST state codes** of the seller and buyer:

| Scenario | Tax applied |
|---|---|
| Seller stateCode === Buyer stateCode | CGST + SGST (each half of GST rate) |
| Seller stateCode !== Buyer stateCode | IGST (full GST rate) |

## API

### Tax engine

| Function | Description |
|---|---|
| `computeInvoice(input)` | Validates input, splits taxes, returns computed invoice with line totals and grand total |
| `computeLine(item, isInterState)` | Computes a single line item's tax |
| `amountInWordsINR(amount)` | Converts a number to Indian-style words ("One Lakh Twenty-Five Thousand Rupees Only") |
| `round2(n)` | Standard 2-decimal rounding helper |

### PDF generation

| Function | Description |
|---|---|
| `generateInvoicePDF(invoice, options?)` | Returns a `Buffer` containing the PDF |
| `generateInvoicePDFToFile(invoice, path, options?)` | Writes the PDF to disk |
| `listTemplates()` | Returns names of all registered templates |
| `registerTemplate(name, renderer)` | Register a custom template |

### Templates

5 built-in templates:

| Name | Style | Best for |
|---|---|---|
| `modern` (default) | Clean sans-serif, blue accent bar, alternating row colors | SaaS, agencies, modern businesses |
| `classic` | Times-Roman serif, bordered boxes, traditional Indian invoice look | Retail, manufacturing, traditional businesses |
| `minimal` | Pure black & white, lots of whitespace, no chrome | Freelancers, consultants, designers |
| `corporate` | Dark filled header, formal structure, large company name | Enterprise, B2B, formal billing |
| `compact` | Dense layout, 7pt font, inline totals | Wholesale, many line items, expense reports |

```ts
await generateInvoicePDFToFile(invoice, 'invoice.pdf', {
  template: 'corporate',
});
```

### Theming

Override any colors, fonts, or density on top of any template:

```ts
await generateInvoicePDFToFile(invoice, 'invoice.pdf', {
  template: 'minimal',
  theme: {
    primary:   '#065f46',         // brand color (accents, header bars)
    accent:    '#10b981',         // secondary accent
    text:      '#111827',         // body text
    muted:     '#6b7280',         // labels, captions
    border:    '#e5e7eb',         // dividers
    rowAlt:    '#f9fafb',         // zebra-stripe rows
    fontHeader: 'Helvetica-Bold', // or 'Times-Bold' | 'Courier-Bold'
    fontBody:   'Helvetica',      // or 'Times-Roman' | 'Courier'
    density:    'compact',        // 'compact' | 'normal' | 'spacious'
    showAmountInWords: true,
  },
});
```

This means **each of the 5 templates × 3 densities × any color combination = effectively unlimited visual variations.**

### Custom templates

Register your own template using PDFKit primitives:

```ts
import { registerTemplate, generateInvoicePDF } from '@twin.techies/gst-invoice';

registerTemplate('my-brand', (ctx) => {
  const { doc, invoice, theme, margin, width } = ctx;
  doc.font('Helvetica-Bold').fontSize(20).text('My Company', margin, margin);
  // ... draw the rest using PDFKit
});

await generateInvoicePDF(invoice, { template: 'my-brand' });
```

`PDFOptions`:

```ts
{
  template?: 'modern' | 'classic' | 'minimal' | 'corporate' | 'compact' | string;
  theme?: Partial<Theme>;
  size?: 'A4' | 'LETTER';        // default 'A4'
  margin?: number;                // default 36
}
```

### E-invoice

| Function | Description |
|---|---|
| `toEInvoiceJSON(invoice)` | Returns NIC IRP v1.1 schema JSON. You upload this to the IRP yourself (or via a GSP). |

### Validators

| Function | Description |
|---|---|
| `isValidGSTIN(gstin)` | Format + checksum + state-code validation |
| `extractStateCodeFromGSTIN(gstin)` | Returns the 2-digit state code |
| `isValidHSN(hsn)` | Validates 4–8 digit HSN/SAC |
| `isValidPincode(pin)` | Validates 6-digit Indian pincode format |
| `isValidStateCode(code)` | Validates GST state code |

### State codes

| Function | Description |
|---|---|
| `GST_STATE_CODES` | Map of `'27' → 'Maharashtra'` etc. |
| `getStateName(code)` | Code → state name |
| `getStateCode(name)` | State name → code |
| `isSameState(a, b)` | Boolean comparison |

## Types

```ts
interface InvoiceInput {
  meta: {
    invoiceNumber: string;
    invoiceDate: string;        // ISO date string
    dueDate?: string;
    placeOfSupply?: string;
    reverseCharge?: boolean;
    documentType?: 'INV' | 'CRN' | 'DBN';
  };
  seller: Party;
  buyer: Party;
  shipTo?: Party;
  items: LineItem[];
  currency?: string;
  notes?: string;
  termsAndConditions?: string;
  logoPath?: string;
}

interface LineItem {
  description: string;
  hsn: string;
  quantity: number;
  unit?: string;
  rate: number;
  gstRate: number;
  discount?: number;
  cess?: number;
}
```

## Roadmap

- v0.2 — Logo rendering, more templates (receipt-style, letterhead, certificate)
- v0.3 — QR code embedding (mandatory for e-invoice for businesses with turnover > ₹5cr)
- v0.4 — Bilingual (English + Hindi/regional) labels
- v0.5 — Optional integration with `@twin.techies/india-pincode` for address validation

## Disclaimer

This library helps generate GST-compliant invoice formats based on **CGST Rules 2017** and the **NIC e-invoice schema v1.1** as publicly published by the Government of India. Users are responsible for:

- Ensuring tax rate accuracy (GST rates change — verify with current CBIC notifications)
- Submitting invoices to the GST portal / IRP as required
- Compliance with current GST regulations applicable to their business

This package is **not affiliated** with the Government of India, GSTN, or NIC. It is **not a GSP** (GST Suvidha Provider) — it does not transmit invoices to government systems on your behalf.

## License

MIT
