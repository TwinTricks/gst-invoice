import { isSameState } from './state-codes';
import { isValidHSN, isValidStateCode } from './validate';
import {
  InvoiceError,
  type ComputedInvoice,
  type ComputedLine,
  type InvoiceInput,
  type InvoiceTotals,
  type LineItem,
} from './types';

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeLine(item: LineItem, isInterState: boolean): ComputedLine {
  if (item.quantity <= 0) {
    throw new InvoiceError('INVALID_INPUT', `Quantity must be > 0 for "${item.description}"`);
  }
  if (item.rate < 0) {
    throw new InvoiceError('INVALID_INPUT', `Rate cannot be negative for "${item.description}"`);
  }
  if (item.gstRate < 0 || item.gstRate > 50) {
    throw new InvoiceError('INVALID_INPUT', `Invalid GST rate ${item.gstRate}% for "${item.description}"`);
  }
  if (!isValidHSN(item.hsn)) {
    throw new InvoiceError('INVALID_HSN', `Invalid HSN/SAC "${item.hsn}" for "${item.description}"`);
  }

  const gross = item.quantity * item.rate;
  const discount = item.discount ?? 0;
  const taxableValue = round2(gross - discount);

  const cessRate = item.cess ?? 0;
  const cessAmount = round2((taxableValue * cessRate) / 100);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterState) {
    igst = round2((taxableValue * item.gstRate) / 100);
  } else {
    const halfTax = round2((taxableValue * item.gstRate) / 200);
    cgst = halfTax;
    sgst = halfTax;
  }

  const totalTax = round2(cgst + sgst + igst + cessAmount);
  const lineTotal = round2(taxableValue + totalTax);

  return {
    ...item,
    taxableValue,
    cgst,
    sgst,
    igst,
    cessAmount,
    totalTax,
    lineTotal,
  };
}

export function computeInvoice(input: InvoiceInput): ComputedInvoice {
  if (!input.items || input.items.length === 0) {
    throw new InvoiceError('INVALID_INPUT', 'Invoice must contain at least one line item');
  }
  if (!isValidStateCode(input.seller.stateCode)) {
    throw new InvoiceError('INVALID_STATE_CODE', `Invalid seller state code "${input.seller.stateCode}"`);
  }
  if (!isValidStateCode(input.buyer.stateCode)) {
    throw new InvoiceError('INVALID_STATE_CODE', `Invalid buyer state code "${input.buyer.stateCode}"`);
  }

  const isInterState = !isSameState(input.seller.stateCode, input.buyer.stateCode);
  const items = input.items.map((i) => computeLine(i, isInterState));

  const subtotal = round2(items.reduce((s, i) => s + i.quantity * i.rate, 0));
  const totalDiscount = round2(items.reduce((s, i) => s + (i.discount ?? 0), 0));
  const taxableValue = round2(items.reduce((s, i) => s + i.taxableValue, 0));
  const cgst = round2(items.reduce((s, i) => s + i.cgst, 0));
  const sgst = round2(items.reduce((s, i) => s + i.sgst, 0));
  const igst = round2(items.reduce((s, i) => s + i.igst, 0));
  const cess = round2(items.reduce((s, i) => s + i.cessAmount, 0));
  const totalTax = round2(cgst + sgst + igst + cess);

  const beforeRound = taxableValue + totalTax;
  const grandTotal = Math.round(beforeRound);
  const roundOff = round2(grandTotal - beforeRound);

  const totals: InvoiceTotals = {
    subtotal,
    totalDiscount,
    taxableValue,
    cgst,
    sgst,
    igst,
    cess,
    totalTax,
    roundOff,
    grandTotal,
  };

  return {
    meta: input.meta,
    seller: input.seller,
    buyer: input.buyer,
    shipTo: input.shipTo,
    currency: input.currency ?? 'INR',
    notes: input.notes,
    termsAndConditions: input.termsAndConditions,
    logoPath: input.logoPath,
    isInterState,
    items,
    totals,
  };
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const TEENS = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 10) return ONES[n]!;
  if (n < 20) return TEENS[n - 10]!;
  const t = Math.floor(n / 10);
  const o = n % 10;
  return TENS[t] + (o ? ' ' + ONES[o] : '');
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = '';
  if (h) out += ONES[h] + ' Hundred';
  if (rest) out += (h ? ' ' : '') + twoDigits(rest);
  return out;
}

export function amountInWordsINR(amount: number): string {
  if (amount < 0) return 'Minus ' + amountInWordsINR(-amount);
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const remainder = rupees % 1000;

  const parts: string[] = [];
  if (crore) parts.push(threeDigits(crore) + ' Crore');
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh');
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand');
  if (remainder) parts.push(threeDigits(remainder));

  let words = parts.join(' ') + ' Rupees';
  if (paise) words += ' and ' + twoDigits(paise) + ' Paise';
  return words + ' Only';
}
