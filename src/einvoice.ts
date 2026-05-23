import type { ComputedInvoice } from './types';

export interface EInvoiceJSON {
  Version: '1.1';
  TranDtls: {
    TaxSch: 'GST';
    SupTyp: 'B2B' | 'B2C' | 'SEZWP' | 'SEZWOP' | 'EXPWP' | 'EXPWOP' | 'DEXP';
    RegRev?: 'Y' | 'N';
    EcmGstin?: string;
    IgstOnIntra?: 'Y' | 'N';
  };
  DocDtls: {
    Typ: 'INV' | 'CRN' | 'DBN';
    No: string;
    Dt: string;
  };
  SellerDtls: PartyJSON;
  BuyerDtls: PartyJSON;
  ShipDtls?: PartyJSON;
  ItemList: ItemJSON[];
  ValDtls: ValueJSON;
}

interface PartyJSON {
  Gstin: string;
  LglNm: string;
  Addr1: string;
  Addr2?: string;
  Loc: string;
  Pin: number;
  Stcd: string;
  Ph?: string;
  Em?: string;
  Pos?: string;
}

interface ItemJSON {
  SlNo: string;
  PrdDesc: string;
  IsServc: 'Y' | 'N';
  HsnCd: string;
  Qty: number;
  Unit?: string;
  UnitPrice: number;
  TotAmt: number;
  Discount: number;
  AssAmt: number;
  GstRt: number;
  IgstAmt: number;
  CgstAmt: number;
  SgstAmt: number;
  CesRt: number;
  CesAmt: number;
  TotItemVal: number;
}

interface ValueJSON {
  AssVal: number;
  CgstVal: number;
  SgstVal: number;
  IgstVal: number;
  CesVal: number;
  Discount: number;
  RndOffAmt: number;
  TotInvVal: number;
}

function toDDMMYYYY(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

function partyToJSON(p: ComputedInvoice['seller']): PartyJSON {
  return {
    Gstin: p.gstin ?? 'URP',
    LglNm: p.name,
    Addr1: p.address.line1,
    ...(p.address.line2 ? { Addr2: p.address.line2 } : {}),
    Loc: p.address.city,
    Pin: parseInt(p.address.pincode, 10),
    Stcd: p.stateCode,
    ...(p.phone ? { Ph: p.phone } : {}),
    ...(p.email ? { Em: p.email } : {}),
  };
}

export function toEInvoiceJSON(invoice: ComputedInvoice): EInvoiceJSON {
  return {
    Version: '1.1',
    TranDtls: {
      TaxSch: 'GST',
      SupTyp: 'B2B',
      RegRev: invoice.meta.reverseCharge ? 'Y' : 'N',
      IgstOnIntra: 'N',
    },
    DocDtls: {
      Typ: invoice.meta.documentType ?? 'INV',
      No: invoice.meta.invoiceNumber,
      Dt: toDDMMYYYY(invoice.meta.invoiceDate),
    },
    SellerDtls: partyToJSON(invoice.seller),
    BuyerDtls: {
      ...partyToJSON(invoice.buyer),
      Pos: invoice.buyer.stateCode,
    },
    ...(invoice.shipTo ? { ShipDtls: partyToJSON(invoice.shipTo) } : {}),
    ItemList: invoice.items.map((item, idx) => ({
      SlNo: String(idx + 1),
      PrdDesc: item.description,
      IsServc: item.hsn.length >= 6 && item.hsn.startsWith('99') ? 'Y' : 'N',
      HsnCd: item.hsn,
      Qty: item.quantity,
      ...(item.unit ? { Unit: item.unit } : {}),
      UnitPrice: item.rate,
      TotAmt: item.quantity * item.rate,
      Discount: item.discount ?? 0,
      AssAmt: item.taxableValue,
      GstRt: item.gstRate,
      IgstAmt: item.igst,
      CgstAmt: item.cgst,
      SgstAmt: item.sgst,
      CesRt: item.cess ?? 0,
      CesAmt: item.cessAmount,
      TotItemVal: item.lineTotal,
    })),
    ValDtls: {
      AssVal: invoice.totals.taxableValue,
      CgstVal: invoice.totals.cgst,
      SgstVal: invoice.totals.sgst,
      IgstVal: invoice.totals.igst,
      CesVal: invoice.totals.cess,
      Discount: invoice.totals.totalDiscount,
      RndOffAmt: invoice.totals.roundOff,
      TotInvVal: invoice.totals.grandTotal,
    },
  };
}
