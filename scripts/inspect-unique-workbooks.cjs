const xlsx = require('xlsx');
for (const filename of process.argv.slice(2)) {
  const workbook = xlsx.readFile(filename, { cellDates: true });
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false, blankrows: false });
    return { name, range: sheet['!ref'], rows: rows.length, firstRows: rows.slice(0, 8) };
  });
  console.log(JSON.stringify({ filename, sheets }, null, 2));
}
