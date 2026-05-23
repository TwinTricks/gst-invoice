# Changelog

All notable changes to `@twin.techies/gst-invoice` will be documented here.

## [0.1.3] - 2026-05-23

### Internal
- Repo now public at https://github.com/TwinTricks/gst-invoice
- No code changes — version bump aligns with `@twin.techies/india-pincode` release.

## [0.1.2] - 2026-05-23

### Added
- `repository`, `homepage`, and `bugs` fields in `package.json` (now visible on the npmjs.com package page).
- "Try on RunKit" and "Open in StackBlitz" badges in README for live in-browser demos.

### Fixed
- Corrected an invalid sample GSTIN (`29AAACB1234A1Z5` → `29AAACB1234A1ZF`) used across examples, tests, and README so live demo code passes `isValidGSTIN()` checksum validation.

## [0.1.1] - 2026-05-23

### Added
- README "Try it live" section with RunKit and StackBlitz one-click links.
- npm version badge.

### Fixed
- Row-height overflow in all 5 invoice templates when line item descriptions wrapped to multiple lines. `measureRowHeight()` helper now computes the actual height needed per cell using PDFKit's `heightOfString()`.

## [0.1.0] - 2026-05-23

### Added
- Initial release.
- **5 built-in PDF templates**: `modern`, `classic`, `minimal`, `corporate`, `compact`.
- **Theming system**: `theme.primary`, `accent`, `text`, `muted`, `border`, `background`, `rowAlt`, `fontHeader`, `fontBody`, `density`, `showAmountInWords`.
- **Custom templates**: `registerTemplate(name, renderer)` + `listTemplates()`.
- **Automatic tax split**: CGST + SGST for intra-state, IGST for inter-state, decided from GST state codes.
- **Validators**: `isValidGSTIN()` with checksum verification, `isValidHSN()`, `isValidPincode()`, `isValidStateCode()`, `extractStateCodeFromGSTIN()`.
- **Tax engine**: `computeInvoice()`, `computeLine()`, `round2()`, `amountInWordsINR()` (Indian numbering — lakh/crore).
- **State codes**: `GST_STATE_CODES`, `getStateName()`, `getStateCode()`, `isSameState()`.
- **PDF generation**: `generateInvoicePDF()` → Buffer, `generateInvoicePDFToFile()` → disk.
- **E-invoice JSON**: `toEInvoiceJSON()` matching NIC IRP v1.1 schema.
- Typed `InvoiceError` with codes `INVALID_GSTIN`, `INVALID_HSN`, `INVALID_STATE_CODE`, `INVALID_INPUT`, `PDF_ERROR`.
- ESM + CJS dual build with TypeScript declarations.
- 32 unit tests.
