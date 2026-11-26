import fs from 'node:fs';
import vm from 'node:vm';
import { buildPrintLoadProductRows, buildPrintLoadPartyRows } from '../backend/printLoadData.js';

const source = fs.readFileSync('src/Dashboard.jsx', 'utf8').replace(/\r\n/g, '\n');
const between = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b < 0) throw new Error(`Could not find ${start}`);
  return source.slice(a, b);
};
const columnCode = between('  const productWiseColumnOptions =', '  const getActivePrintLoadColumnOptions =');
const valueCode = between('  const formatPrintLoadDate =', '  const chunkPrintLoadRows =');
const weightCode = between('  const getPrintLoadColumnWeight =', '  const selectedPrintLoadColumnOptions =');
const context = {};
vm.createContext(context);
vm.runInContext(`${columnCode}\n${valueCode}\n${weightCode}\nObject.assign(this,{productWiseColumnOptions,partyWiseColumnOptions,defaultProductWiseColumns,defaultPartyWiseColumns,getPrintLoadCellValue,isPrintLoadNumericColumn,getPrintLoadColumnWeight});`, context);
const printFunction = between('  const handlePrint = () => {', '  useEffect(() => {\n    if (!printLoadDirectPrint)');
const styles = printFunction.match(/<style>([\s\S]*?)<\/style>/)?.[1];
if (!styles) throw new Error('Could not find load print stylesheet');
const escape = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const products = buildPrintLoadProductRows([{ items: [
  { productCode:'S1', productName:'TATA SALT 1 KG', mrp:34, qty:20, units:'PCS', boxPack:20 },
  { productCode:'S2', productName:'SUNFLOWER OIL 1 L', mrp:160, qty:24, units:'PCS', boxPack:12 },
  { productCode:'S3', productName:'BISCUITS FAMILY PACK', mrp:50, qty:10, units:'PCS', boxPack:20 },
  { productCode:'S4', productName:'TEA 250 G', mrp:135, qty:36, units:'PCS', boxPack:12 },
] }]);
const bills = [
  { Series:'UE', BillNo:101, BillDate:'2026-11-26', PartyName:'VIJAY TRADING', Amount:1000, AreaName:'KONDWA', SalesmanName:'VILAS', Cash:400 },
  { Series:'UE', BillNo:102, BillDate:'2026-11-26', PartyName:'OM GENERAL STORE', Amount:2500, AreaName:'PUNE', SalesmanName:'VILAS', Cheque:1000 },
  { Series:'UE', BillNo:103, BillDate:'2026-11-26', PartyName:'SAMPLE RETAILERS', Amount:1800, AreaName:'KATRAJ', SalesmanName:'RAJ', UPI:800 },
];
const parties = buildPrintLoadPartyRows(bills);

for (const [kind, rows, options, defaults] of [
  ['product', products, context.productWiseColumnOptions, context.defaultProductWiseColumns],
  ['party', parties, context.partyWiseColumnOptions, context.defaultPartyWiseColumns],
]) {
  const columns = options.filter((c) => defaults.includes(c.key));
  const weight = columns.reduce((sum, c) => sum + context.getPrintLoadColumnWeight(c.key), 0);
  const colgroup = columns.map((c) => `<col class="print-load-col-${c.key}" style="width:${100 * context.getPrintLoadColumnWeight(c.key) / weight}%">`).join('');
  const head = columns.map((c) => `<th class="${context.isPrintLoadNumericColumn(c.key) ? 'number-cell' : ''}">${escape(c.label)}</th>`).join('');
  const body = rows.map((row, i) => `<tr>${columns.map((c) => `<td class="${context.isPrintLoadNumericColumn(c.key) ? 'number-cell' : ''}">${escape(context.getPrintLoadCellValue(row, c.key, i))}</td>`).join('')}</tr>`).join('');
  const total = kind === 'party' ? `<tfoot><tr><td colspan="4" class="print-load-document-total-label">Total</td><td class="number-cell print-load-document-total-value">5,300.00</td>${columns.slice(5).map(() => '<td></td>').join('')}</tr></tfoot>` : '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${styles}
    @media screen { html, body { width:297mm; height:210mm; margin:0; background:white; } body { padding:8mm; } }
  </style></head><body><section class="print-load-document-page"><header class="print-load-document-header"><h1>UNIQUE ENTERPRISES</h1><div class="print-load-document-details">
    <div><b>Report :</b> Print Load - ${kind === 'party' ? 'Party Wise' : 'Product Wise'}</div>
    <div><b>Load No. :</b> LD-1 <span class="print-load-header-gap"><b>Load Date :</b> 26/11/2026</span></div>
    <div><b>Narration :</b> -</div><div><b>Total Bills :</b> 3 <span class="print-load-header-gap"><b>Total Party :</b> 3</span><span class="print-load-header-gap"><b>Total Amt :</b> 5,300.00</span></div>
    <div><b>Area Name :</b> KONDWA, PUNE, KATRAJ</div><div><b>Print Date :</b> 26/11/2026</div><div><b>Page :</b> 1/1</div>
    </div></header><div class="print-load-document-table-wrap"><table class="print-load-document-table" style="--load-table-font:8.5pt"><colgroup>${colgroup}</colgroup><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${total}</table></div></section></body></html>`;
  fs.writeFileSync(`output/load-print-${kind}-sample.html`, html);
}
console.log('Generated product and party load samples from the current print styles, fields and calculations.');
