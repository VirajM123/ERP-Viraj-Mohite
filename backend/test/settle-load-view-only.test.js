import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../../src/Dashboard.jsx', import.meta.url), 'utf8');

test('viewing a settlement cannot change the bill type, load fields or save', async () => {
  const sections = [
    ['  const changeSettleBillTypeByF4 = async', '  const changeInvoiceBillTypeByF4 = async'],
    ['  const handleSettleLoadInputChange =', '  const getSettleItemStatus ='],
    ['  const saveSettleLoad = async', '  const loadSettleLoadList ='],
  ];
  const read = (from, to) => {
    const start = source.indexOf(from), end = source.indexOf(to, start);
    assert.ok(start >= 0 && end > start, from);
    return source.slice(start, end);
  };
  const context = { isFormReadOnly: true, showSettleLoad: true, settleLoadItems: [{}], settleLoadSaveInFlight: { current: false },
    setSettleLoadFormData: () => { throw new Error('changed'); }, fetch: () => { throw new Error('request'); },
    getFirmSession: () => { throw new Error('save attempted'); }, console };
  await vm.runInNewContext(`${read(...sections[0])}\n${read(...sections[1])}\n${read(...sections[2])}\nPromise.all([changeSettleBillTypeByF4(), saveSettleLoad(), handleSettleLoadInputChange({ target: { name: 'loadNo', value: '5' } })]);`, context);
  for (const button of ['adjust', 'pending', 'receipt', 'cancel']) {
    assert.match(source, new RegExp(`className="settle-row-button settle-${button}-button"\\s+disabled=\\{isFormReadOnly \\|\\|`));
  }
  assert.match(source, /className="settle-top-button settle-top-save"[\s\S]*?disabled=\{isFormReadOnly \|\| isSavingSettleLoad\}/);
});
