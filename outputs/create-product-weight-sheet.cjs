const ExcelJS = require('../backend/node_modules/exceljs');

const rows = [
  ['I-Shakti (25x1kg)', 1, '1 kg', '25 x 1 kg', 'Clear', 'Weight of one 1 kg pack.'],
  ['IShakti Soda 12.6 Kg (70 Gm X 9/20) Rs10', 0.07, '70 g', '70 g x 9/20; 12.6 kg total', 'Confirm unit', '0.07 kg per sachet; confirm whether stock quantity counts individual sachets or packs of 9.'],
  ['SODA 1KG (25)', 1, '1 kg', '25 x 1 kg', 'Clear', 'Weight of one 1 kg pack.'],
  ['TATA HIMALAYAN ROCK SALT 18x1KG Bag', 1, '1 kg', '18 x 1 kg', 'Clear', 'Weight of one 1 kg pack, not the 18 kg outer bag.'],
  ['TATA LITE FG 1KG (25 PC)', 1, '1 kg', '25 x 1 kg', 'Clear', 'Weight of one 1 kg pack.'],
  ['TATA SALT BLACK SALT 144X70G SACHET', 0.07, '70 g', '144 x 70 g', 'Clear', 'Weight of one sachet.'],
  ['TATA SALT CRYSTAL 25 X 1 KG. (FG) NEW MR', 1, '1 kg', '25 x 1 kg', 'Clear', 'Weight of one 1 kg pack.'],
  ['TATA SALT IMMUNO 1 x 25 KG', 25, '25 kg (assumed)', '1 x 25 kg', 'Confirm unit', 'Assumes one 25 kg unit. Confirm the actual package; if this means 25 packs of 1 kg, enter 1 instead.'],
  ['TATA SALT PACKED 25 X 2 KG (MRP 55)', 2, '2 kg', '25 x 2 kg', 'Clear', 'Weight of one 2 kg pack.'],
  ['TATA SALT PLUS 1 x 25 KG', 25, '25 kg (assumed)', '1 x 25 kg', 'Confirm unit', 'Assumes one 25 kg unit. Confirm the actual package; if this means 25 packs of 1 kg, enter 1 instead.'],
  ['TATA SALT POWDER 30 X 1 KG (MRP 34)', 1, '1 kg', '30 x 1 kg', 'Clear', 'Weight of one 1 kg pack.'],
  ['TATA SALT ROCK 1KG', 1, '1 kg', '1 kg', 'Clear', 'Weight of one pack.'],
  ['TATA SALT ROCK 500 GM', 0.5, '500 g', '500 g', 'Clear', '500 g = 0.5 kg.'],
  ['TATA SALT ROCK SALT 144X80 G SACHET', 0.08, '80 g', '144 x 80 g', 'Clear', 'Weight of one sachet. Product name is repeated in the supplied list.'],
  ['TATA SALT ROCK SALT 144X80 G SACHET', 0.08, '80 g', '144 x 80 g', 'Duplicate', 'Repeated exactly in the supplied list; confirm whether this is a separate product code.'],
  ['TATA SALT SENDHA 25X1', 1, '1 kg (assumed)', '25 x 1', 'Confirm unit', 'The name does not state kg. Assumes 25 packs of 1 kg; check the label.'],
  ['TATA SALT Sendha+ 12X1 KG', 1, '1 kg', '12 x 1 kg', 'Clear', 'Weight of one 1 kg pack.'],
  ['TSL 25X1kg+5X80g Rock Salt free', 1, '1 kg salt pack', '25 x 1 kg + 5 x 80 g free', 'Confirm unit', '1 kg per main pack; excludes free sachets. If one stock unit is the full promotional bundle, the contents total 25.4 kg.'],
  ['Tata I-Shakti Cooking Soda 192X60g', 0.06, '60 g', '192 x 60 g', 'Clear', 'Weight of one sachet.'],
  ['Tata I-Shakti Soda 1kgX(25+1)', 1, '1 kg', '25 + 1 x 1 kg', 'Confirm unit', '1 kg per individual pack, including a free pack if counted separately; full 26-pack bundle is 26 kg.'],
];

async function main() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Product weights', { views: [{ state: 'frozen', ySplit: 4 }] });
  sheet.mergeCells('A1:F1');
  sheet.getCell('A1').value = 'PRODUCT MASTER — WEIGHT VALUES';
  sheet.getCell('A1').font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17365D' } };
  sheet.mergeCells('A2:F2');
  sheet.getCell('A2').value = 'Enter Weight in kg per individual stock unit. Confirm the highlighted rows and the master basic unit before entry.';
  sheet.getCell('A2').font = { italic: true, color: { argb: 'FF334155' } };
  sheet.mergeCells('A3:F3');
  sheet.getCell('A3').value = 'Reference sheet for manual entry; product codes are not provided, so this is not an import file.';
  sheet.getCell('A3').font = { italic: true, color: { argb: 'FF64748B' } };
  sheet.addRow(['Product name', 'Weight to enter (kg)', 'Per stock unit', 'Name / pack notation', 'Check', 'Explanation']);
  for (const row of rows) sheet.addRow(row);
  sheet.columns = [{ width: 46 }, { width: 22 }, { width: 20 }, { width: 28 }, { width: 18 }, { width: 78 }];
  sheet.getRow(4).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563A6' } };
  sheet.autoFilter = { from: 'A4', to: `F${sheet.rowCount}` };
  for (let n = 5; n <= sheet.rowCount; n++) {
    const row = sheet.getRow(n);
    row.height = 32;
    row.alignment = { vertical: 'middle', wrapText: true };
    row.getCell(2).numFmt = '0.###';
    row.getCell(2).font = { bold: true, color: { argb: 'FF14532D' } };
    if (row.getCell(5).value !== 'Clear') {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
    } else if (n % 2 === 0) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F6FC' } };
    }
  }
  await workbook.xlsx.writeFile('outputs/Product_Master_Weight_Values.xlsx');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
