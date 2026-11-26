// Render the application's actual invoice generator with representative sample data.
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/Dashboard.jsx', 'utf8').replace(/\r\n/g, '\n');
function section(start, end) {
  const first = source.indexOf(start);
  const last = source.indexOf(end, first);
  if (first < 0 || last < 0) throw new Error(`Cannot find ${start}`);
  return source.slice(first, last);
}
const helpers = section('  const escapeInvoiceHtml =', '  /* =========================================================\n    SALES LIST ACTUAL BILL PREVIEW');
const normalize = section('  const normalizeInvoicePrintData =', '  const generateInvoicePreviewHTML =');
const generator = section('  const generateInvoicePreviewHTML =', '  /* =========================================================\n    PRINT LOAD COLUMN DEFINITIONS');
const context = { console, DEFAULT_INVOICE_TERMS: 'default terms', convertAmountToWords: () => 'Two Lakh Fifty Eight Thousand Rupees Only' };
vm.createContext(context);
vm.runInContext(`${helpers}\n${normalize}\n${generator}\nthis.renderInvoice = generateInvoicePreviewHTML;`, context);
const payload = {
  firm: { firmName: 'UNIQUE ENTERPRISES', address1: 'GODOWN NO 2, S NO 15/1, MILKAT NO. 1008', address2: 'NIMBHALKAR GUJARWADI ROAD', city: 'PUNE', pinCode: '411046', state: 'MAHARASHTRA', stateCode: '27', phoneNo: '9209383847', gstNo: '27GGJPB5187G1Z5' },
  party: { partyName: 'VIJAY TRADING COM (KONDWA)', address: 'OPP KONARK PURAM', town: 'KONDWA', pinCode: '411048', state: 'MAHARASHTRA', stateCode: '27', gstNo: '27AAKFV4136A1ZC' },
  salesman: { salesmanName: 'VILAS', mobileNo: '7219323616' },
  area: { areaName: 'ALL' },
  bill: { BillSeries: 'UE-', BillNo: '2', BillDate: '2026-11-26', CashDiscountAmount: 3, items: [{ productName: 'TATA SALT POWDER 30 X 1 KG (MRP 34)', hsn: '25010010', mrp: 34, unit: 'PCS', qty: 9000, rate: 28.67, grossAmount: 258003, taxableAmount: 258000, cashDiscountAmount: 3, netAmount: 258000 }] }
};
let html = context.renderInvoice(payload, { reportNumber: 'unique_a5', paperSize: 'A5', orientation: 'landscape', includeButtons: false, copies: 1 });
const assert = require('node:assert/strict');
const multiPayload = { ...payload, bill: { ...payload.bill, items: Array.from({ length: 6 }, (_, index) => ({ ...payload.bill.items[0], productName: `ITEM ${index + 1}`, oldMrp: index === 0 ? 30 : '' })) } };
const multi = context.renderInvoice(multiPayload, { reportNumber: 'unique_a5', copies: 1, printAccountDetails: { termsAndConditions: 'Custom <terms>' } });
assert.equal((multi.match(/<main class="invoice-page/g) || []).length, 2);
assert.match(multi, /ITEM 6/);
assert.match(multi, /30\.00/);
assert.match(multi, /Custom &lt;terms&gt;/);
assert.match(multi, /size: A5 landscape/);
// Show the physical page including the same 5 mm page margin used by @page.
html = html.replace('</head>', `<style>
  html,body { width:210mm; height:148mm; margin:0; padding:0; background:white; }
  .preview-shell { width:210mm; height:148mm; padding:5mm; background:white; }
  .invoice-page { margin:0 !important; }
</style></head>`);
fs.writeFileSync('output/unique-a5-actual-sample.html', html);
console.log('Generated output/unique-a5-actual-sample.html from src/Dashboard.jsx');
