import fs from 'node:fs';
let s = fs.readFileSync('src/Transaction.jsx', 'utf8').replaceAll('\r\n', '\n');
s = s.replace('import "./Transaction.css";', 'import "./Transaction.css";\nimport "./VoucherForms.css";');
const region = (name,end) => {const a=s.indexOf('  const '+name); const b=s.indexOf(end,a); return [a,b,s.slice(a,b)];};
const footer = buttons => `<footer className="voucher-form-footer">
          <small>Required fields marked <span>*</span></small>
          <div className="voucher-footer-actions">${buttons}</div>
        </footer>`;
const header = (title,subtitle,edit) => `<header className="voucher-form-header">
          <div className="voucher-breadcrumb">Transactions <span>/</span> ${title}</div>
          <div className="voucher-title-row"><h2>${title}</h2><span className="voucher-new-badge">{${edit} ? "Edit" : "New"}</span></div>
          <p>${subtitle}</p>
        </header>`;
for (const [name,kind,title,subtitle,edit] of [
  ['renderJournalForm','journal','Journal Voucher','Create balanced debit and credit entries.','editJournalId'],
  ['renderContraForm','contra','Contra Voucher','Record cash deposits, withdrawals and bank transfers.','editContraId']
]) {
  let [a,b,t] = region(name,'\n  );');
  t = t.replace(`className="${kind}-billing-page"`, `className="${kind}-billing-page voucher-design voucher-${kind}"`);
  const start=t.indexOf(`        <div className="${kind}-billing-topbar">`);
  const end=t.indexOf('        {/* =================',start);
  const buttons=t.slice(start,end).match(/<button\b[\s\S]*?<\/button>/g);
  const save=buttons[0].replace('💾 ','').replace(`className="${kind}-save-header-btn"`,'className="voucher-primary-button"');
  const cancel=buttons.at(-1).replace(`className="${kind}-close-header-btn"`,'className="voucher-secondary-button"').replace('×','Cancel');
  t=t.slice(0,start)+header(title,subtitle,edit)+'\n\n'+t.slice(end);
  const pos=t.lastIndexOf('      </div>');
  t=t.slice(0,pos)+'        '+footer(cancel+'\n'+save)+'\n'+t.slice(pos);
  if(kind==='contra') {
    t=t.replace('<h3>Contra Information</h3>','<h3>Transaction details</h3>').replace('Transaction VNo <span>','Voucher No. <span>').replace('<h3>Contra Summary</h3>','<h3>Voucher summary</h3>').replace('<span>Transaction Amount</span>','<span>Transfer amount</span>');
    const radios=[['CASH DEPOSIT','Cash Deposit'],['CASH WITHDRAWAL','Cash Withdrawal'],['BANK TRANSFER','Bank Transfer']].map(([value,label])=>`<label className="voucher-type-option">
                  <input type="radio" name="transactionType" value="${value}"
                    checked={contraFormData.transactionType === "${value}"}
                    onChange={handleContraInput} />
                  <span>${label}</span>
                </label>`).join('\n');
    t=t.replace(/<select\s+name="transactionType"[\s\S]*?<\/select>/,`<div className="voucher-type-options" role="radiogroup" aria-label="Transaction Type">${radios}</div>`);
    t=t.replace('        <section className="contra-entry-section">','        <div className="voucher-contra-body">\n        <section className="contra-entry-section">');
    t=t.replace('        <footer className="voucher-form-footer">','        </div>\n        <footer className="voucher-form-footer">');
  } else {
    t=t.replace('<h3>Journal Information</h3>','<h3>Voucher details</h3>').replace('<label>Is GST</label>','<label>GST applicable</label>').replace('<h3>Journal Entries</h3>','<h3>Journal entries</h3>').replace('<th>Seq No</th>','<th>#</th>').replace('<th>Debit Amount</th>','<th>Debit (₹)</th>').replace('<th>Credit Amount</th>','<th>Credit (₹)</th>');
    const narr=t.match(/            <div className="journal-field journal-narration-inline">[\s\S]*?<\/div>/)[0];
    t=t.replace(narr,'').replace('        <section className="journal-summary-section">','        <div className="voucher-journal-bottom">\n'+narr+'\n        <section className="journal-summary-section">');
    t=t.replace('        <footer className="voucher-form-footer">','        </div>\n        <footer className="voucher-form-footer">');
    t=t.replace('              </tbody>',`              </tbody>
              <tfoot><tr><td colSpan="3">Total</td>
                <td>{Number(journalSummary.totalDr || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>{Number(journalSummary.totalCr || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr></tfoot>`);
  }
  s=s.slice(0,a)+t+s.slice(b);
}
let [a,b,t]=region('renderCollectionVoucherForm','\n        {collectionVoucherFormData.collectionType === "Bill wise"');
t=t.replace('className="master-section collection-voucher-section"','className="master-section collection-voucher-section voucher-design voucher-collection"');
const start=t.indexOf('          <div className="collection-premium-header">');
const end=t.indexOf('          <div className="collection-voucher-card">',start);
const buttons=t.slice(start,end).match(/<button\b[\s\S]*?<\/button>/g);
const save=buttons[0].replace('💾 ','').replace('className="collection-save-btn-top"','type="button" className="voucher-primary-button"');
const cancel=buttons.at(-1).replace('className="collection-close-btn"','type="button" className="voucher-secondary-button"').replace('×','Cancel');
t=t.slice(0,start)+header('Collection Voucher','Select outstanding bills and record collections.','editCollectionVoucherId')+'\n'+t.slice(end);
const ns=t.indexOf('              <div className="collection-field collection-narr-field">');
const ne=t.indexOf('\n            <div className="receipt-grid-wrap',ns);
let narr=t.slice(ns,ne);
const oldSelection=narr.match(/<button\b[\s\S]*?<\/button>/)[0];
const selection=oldSelection.replace('                    Select{" "}','                    + Select{" "}');
narr=narr.replace(oldSelection,'');
narr=narr.slice(0,narr.lastIndexOf('            </div>'));
t=t.slice(0,ns)+'            </div>\n          </section>\n          <section className="voucher-collection-bills">\n            <div className="voucher-bills-heading"><h3>Selected bills <small>{selectedBills.length} bills selected</small></h3>'+selection+'</div>\n'+t.slice(ne);
t=t.replace('<div className="collection-voucher-header-grid">','<section className="voucher-collection-details"><h3>Collection details</h3>\n            <div className="collection-voucher-header-grid">');
t=t.replace('<label>Collection Date :</label>','<label>Collection Date <span>*</span></label>').replace('<label>Col VNo. :</label>','<label>Voucher No. <span>*</span></label>').replace('<label>Collection Type :</label>','<label>Collection Type</label>');
t=t.replace('            <div className="collection-bottom-summary">','            <div className="voucher-collection-bottom">\n'+narr.replace('<label>Narr :</label>','<label>Narration</label>')+'\n            <div className="collection-bottom-summary">');
t=t.replace('Total Collection Amount <b>','Total collection <b>').replace('Total Cash Collection <b>','Cash <b>').replace('Total Cheque Collection <b>','Cheque <b>').replace('Total Bills <b>','Selected bills <b>');
let pos=t.lastIndexOf('          </div>');
t=t.slice(0,pos)+'            </div>\n          </section>\n'+t.slice(pos);
pos=t.lastIndexOf('        </div>');
t=t.slice(0,pos)+footer(cancel+'\n'+save)+'\n'+t.slice(pos);
t=t.replace(`                    <th>Bill Series</th>
                    <th>Bill No</th>
                    <th>Bill Date</th>
                    <th>Party Code</th>
                    <th>Party Name</th>`,`                    <th>Bill / Date</th>
                    <th>Party / Code</th>`);
t=t.replace('>Bill Amt</th>','>Bill Amt (₹)</th>').replace('>Old Collection</th>','>Collected (₹)</th>').replace('>Balance</th>','>Balance (₹)</th>').replace('<th>Collection Amt</th>','<th>Collection (₹)</th>').replace('<th>Discount</th>','<th>Discount (₹)</th>');
t=t.replace('                    <th>REC Series</th>\n                    <th>REC VNo</th>','                    <th>Receipt</th>');
t=t.replace('colSpan="13"','colSpan="9"').replace('Click Select button to load collection bills','Select bills, salesmen or areas to load outstanding bills');
t=t.replace('<tr key={item.id}>','<tr key={item.id} className={item.selected ? "voucher-selected-row" : ""}>');
t=t.replace(`                        <td>{item.billSeries || "-"}</td>
                        <td>{item.billNo || "-"}</td>
                        <td>{item.billDate || "-"}</td>
                        <td>{item.partyCode || "-"}</td>
                        <td>{item.partyName || "-"}</td>`,`                        <td><strong>{item.billSeries || "-"} / {item.billNo || "-"}</strong><small>{item.billDate || "-"}</small></td>
                        <td><strong>{item.partyName || "-"}</strong><small>{item.partyCode || "-"}</small></td>`);
t=t.replace(`                        <td>
                          <input
                            type="text"
                            className="table-input"
                            value={item.recSeries`,`                        <td><div className="voucher-receipt-fields">
                          <input
                            aria-label="Receipt series"
                            type="text"
                            className="table-input"
                            value={item.recSeries`);
t=t.replace(`                        </td>

                        <td>
                          <input
                            type="text"
                            className="table-input"
                            value={item.recVNo`,`                          <span>/</span>
                          <input
                            aria-label="Receipt voucher number"
                            type="text"
                            className="table-input"
                            value={item.recVNo`);
t=t.replace(`                            placeholder="VNo"
                            style={{ width: '80px' }}
                          />
                        </td>`,`                            placeholder="VNo"
                            style={{ width: '80px' }}
                          />
                        </div></td>`);
s=s.slice(0,a)+t+s.slice(b);
fs.writeFileSync('src/Transaction.jsx',s.replaceAll('\n','\r\n'));
