import fs from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
const traverse = traverseModule.default;
const names = ['renderJournalForm', 'renderContraForm', 'renderCollectionVoucherForm'];
const parseSource = text => parse(text, { sourceType: 'module', plugins: ['jsx'] });
const clean = value => JSON.parse(JSON.stringify(value, (key, v) =>
  ['start', 'end', 'loc', 'extra', 'leadingComments', 'trailingComments', 'innerComments', 'comments', 'tokens'].includes(key) ? undefined : v));
const before = parseSource(execFileSync('git', ['show', 'HEAD:src/Transaction.jsx'], {encoding:'utf8'}));
const after = parseSource(fs.readFileSync('src/Transaction.jsx','utf8'));
function audit(ast) {
  const forms = {};
  traverse(ast, {
    ImportDeclaration(path) { if (path.node.source.value === './VoucherForms.css') path.remove(); },
    VariableDeclarator(path) {
      if (!names.includes(path.node.id.name)) return;
      const handlers = new Set();
      const controls = [];
      const types = [];
      path.traverse({
        JSXAttribute(p) {
          if (/^on[A-Z]/.test(p.node.name.name)) handlers.add(JSON.stringify(clean(p.node)));
        },
        JSXOpeningElement(p) {
          const n = p.node;
          if (!['input','select'].includes(n.name.name)) return;
          const attrs = Object.fromEntries(n.attributes.filter(a => a.type === 'JSXAttribute').map(a => [a.name.name,a.value]));
          if (attrs.name?.value === 'transactionType') {
            types.push(clean(n));
            return;
          }
          const keys = ['name','type','value','checked','readOnly','disabled','min','max','step','inputMode','autoComplete'];
          controls.push(JSON.stringify(Object.fromEntries(keys.filter(k => attrs[k] !== undefined).map(k => [k,clean(attrs[k])]))));
        },
      });
      forms[path.node.id.name] = {handlers:[...handlers].sort(),controls:controls.sort(),types};
      // Collection's local selected-bill and formatting calculations remain checked.
      if (path.node.init.body.type === 'BlockStatement') {
        path.node.init.body.body = path.node.init.body.body.filter(n => n.type !== 'ReturnStatement');
      } else {
        path.node.init.body = {type:'NullLiteral'};
      }
      path.skip();
    }
  });
  return {ast:clean(ast),forms};
}
const old = audit(before), current = audit(after);
assert.deepEqual(current.ast, old.ast, 'All code outside the three form render trees must remain identical');
for (const name of names) {
  assert.deepEqual(current.forms[name].handlers, old.forms[name].handlers, `${name}: event handlers changed`);
  assert.deepEqual(current.forms[name].controls, old.forms[name].controls, `${name}: control values or constraints changed`);
  console.log(`PASS ${name}: all existing event handlers and control bindings unchanged`);
}
const radios = current.forms.renderContraForm.types;
assert.equal(radios.length, 3);
assert.deepEqual(radios.map(n => n.attributes.find(a => a.name?.name === 'value').value.value), ['CASH DEPOSIT','CASH WITHDRAWAL','BANK TRANSFER']);
assert.ok(radios.every(n => n.attributes.some(a => a.name?.name === 'onChange' && a.value.expression.name === 'handleContraInput')));
console.log('PASS Contra segmented controls: same transaction values and existing input handler');
console.log('PASS all remaining application code, calculations, validation, effects, permissions, API calls and modal logic unchanged');
