import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('database godown lookups cannot be shadowed by the request Godown field', async () => {
  const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');
  assert.match(source, /const GodownModel = mongoose\.models\.Mas_Godown \|\| mongoose\.model\("Mas_Godown", godownSchema\)/);
  assert.doesNotMatch(source, /\bGodown\.(?:find|create|aggregate|count|delete|update)/);
  assert.match(source, /GodownModel\.findOne\(\{ distributorId, firmId, godownCode: GDCode/);
  assert.match(source, /GodownModel\.findOne\(\{ distributorId, firmId, godownCode: gdCode/);
});

test('sales and purchase master checks run sequentially inside their transaction session', async () => {
  const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /const \[salesParty, salesCompany, salesGodown, salesPerson\] = await Promise\.all/);
  assert.doesNotMatch(source, /const \[purchaseSupplier, purchaseCompany, purchaseGodown\] = await Promise\.all/);
  assert.match(source, /const salesParty = await Account\.findOne[\s\S]*?const salesCompany = await Company\.findOne[\s\S]*?const salesGodown = await GodownModel\.findOne/);
  assert.match(source, /const purchaseSupplier = await OtherAccount\.findOne[\s\S]*?const purchaseCompany = await Company\.findOne[\s\S]*?const purchaseGodown = await GodownModel\.findOne/);
});
