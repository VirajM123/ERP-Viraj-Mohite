from pathlib import Path
import re

p = Path('src/Transaction.jsx')
s = p.read_text(encoding='utf-8')
s = s.replace('import "./Transaction.css";', 'import "./Transaction.css";\nimport "./VoucherForms.css";', 1)

def region(name, end):
    a = s.index('  const ' + name)
    b = s.index(end, a)
    return a, b, s[a:b]

def footer(buttons):
    return '''<footer className="voucher-form-footer">
          <small>Required fields marked <span>*</span></small>
          <div className="voucher-footer-actions">''' + buttons + '''</div>
        </footer>'''

def header(title, subtitle, badge):
    return f'''<header className="voucher-form-header">
          <div className="voucher-breadcrumb">Transactions <span>/</span> {title}</div>
          <div className="voucher-title-row"><h2>{title}</h2><span className="voucher-new-badge">{badge}</span></div>
          <p>{subtitle}</p>
        </header>'''

for name, kind, title, subtitle, edit in [
    ('renderJournalForm', 'journal', 'Journal Voucher', 'Create balanced debit and credit entries.', 'editJournalId'),
    ('renderContraForm', 'contra', 'Contra Voucher', 'Record cash deposits, withdrawals and bank transfers.', 'editContraId'),
]:
    a,b,t = region(name, '\n  );')
    t = t.replace(f'className="{kind}-billing-page"', f'className="{kind}-billing-page voucher-design voucher-{kind}"', 1)
    start = t.index(f'        <div className="{kind}-billing-topbar">')
    end = t.index('        {/* =================', start)
    old = t[start:end]
    buttons = re.findall(r'<button\b[\s\S]*?</button>', old)
    save = buttons[0].replace('💾 ', '').replace(f'className="{kind}-save-header-btn"', 'className="voucher-primary-button"')
    cancel = buttons[-1].replace(f'className="{kind}-close-header-btn"', 'className="voucher-secondary-button"').replace('×', 'Cancel')
    t = t[:start] + header(title, subtitle, '{' + edit + ' ? "Edit" : "New"}') + '\n\n' + t[end:]
    pos = t.rindex('      </div>')
    t = t[:pos] + '        ' + footer(cancel + '\n' + save) + '\n' + t[pos:]
    if kind == 'contra':
        t = t.replace('<h3>Contra Information</h3>', '<h3>Transaction details</h3>').replace('Transaction VNo <span>', 'Voucher No. <span>').replace('<h3>Contra Summary</h3>', '<h3>Voucher summary</h3>').replace('<span>Transaction Amount</span>', '<span>Transfer amount</span>')
        select = re.search(r'<select\s+name="transactionType"[\s\S]*?</select>', t).group()
        radios = '''<div className="voucher-type-options" role="radiogroup" aria-label="Transaction Type">'''
        for value, label in [('CASH DEPOSIT', 'Cash Deposit'), ('CASH WITHDRAWAL', 'Cash Withdrawal'), ('BANK TRANSFER', 'Bank Transfer')]:
            radios += f'''\n                <label className="voucher-type-option">
                  <input type="radio" name="transactionType" value="{value}"
                    checked={{contraFormData.transactionType === "{value}"}}
                    onChange={{handleContraInput}} />
                  <span>{label}</span>
                </label>'''
        t = t.replace(select, radios + '\n              </div>')
        t = t.replace('        <section className="contra-entry-section">', '        <div className="voucher-contra-body">\n        <section className="contra-entry-section">', 1)
        t = t.replace('        <footer className="voucher-form-footer">', '        </div>\n        <footer className="voucher-form-footer">', 1)
    else:
        t = t.replace('<h3>Journal Information</h3>', '<h3>Voucher details</h3>').replace('<label>Is GST</label>', '<label>GST applicable</label>').replace('<h3>Journal Entries</h3>', '<h3>Journal entries</h3>').replace('<th>Seq No</th>', '<th>#</th>').replace('<th>Debit Amount</th>', '<th>Debit (₹)</th>').replace('<th>Credit Amount</th>', '<th>Credit (₹)</th>')
        narr = re.search(r'            <div className="journal-field journal-narration-inline">[\s\S]*?</div>', t).group()
        t = t.replace(narr, '')
        t = t.replace('        <section className="journal-summary-section">', '        <div className="voucher-journal-bottom">\n' + narr + '\n        <section className="journal-summary-section">', 1)
        t = t.replace('        <footer className="voucher-form-footer">', '        </div>\n        <footer className="voucher-form-footer">', 1)
        totals = '''
              <tfoot><tr><td colSpan="3">Total</td>
                <td>{Number(journalSummary.totalDr || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>{Number(journalSummary.totalCr || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr></tfoot>'''
        t = t.replace('              </tbody>', '              </tbody>' + totals, 1)
    s = s[:a] + t + s[b:]

a,b,t = region('renderCollectionVoucherForm', '\n        {collectionVoucherFormData.collectionType === "Bill wise"')
t = t.replace('className="master-section collection-voucher-section"', 'className="master-section collection-voucher-section voucher-design voucher-collection"')
start = t.index('          <div className="collection-premium-header">')
end = t.index('          <div className="collection-voucher-card">', start)
old = t[start:end]
buttons = re.findall(r'<button\b[\s\S]*?</button>', old)
save = buttons[0].replace('💾 ', '').replace('className="collection-save-btn-top"', 'type="button" className="voucher-primary-button"')
cancel = buttons[-1].replace('className="collection-close-btn"', 'type="button" className="voucher-secondary-button"').replace('×', 'Cancel')
t = t[:start] + header('Collection Voucher', 'Select outstanding bills and record collections.', '{editCollectionVoucherId ? "Edit" : "New"}') + '\n' + t[end:]
narr_start = t.index('              <div className="collection-field collection-narr-field">')
narr_end = t.index('\n            <div className="receipt-grid-wrap', narr_start)
narr = t[narr_start:narr_end]
selection = re.search(r'<button\b[\s\S]*?</button>', narr).group()
selection = selection.replace('                    Select{" "}', '                    + Select{" "}')
narr = narr.replace(re.search(r'<button\b[\s\S]*?</button>', narr).group(), '')
# The captured block ends with the header grid closing tag; keep it in place.
narr = narr[:narr.rfind('            </div>')]
t = t[:narr_start] + '            </div>\n          </section>\n          <section className="voucher-collection-bills">\n            <div className="voucher-bills-heading"><h3>Selected bills <small>{selectedBills.length} bills selected</small></h3>' + selection + '</div>\n' + t[narr_end:]
t = t.replace('<div className="collection-voucher-header-grid">', '<section className="voucher-collection-details"><h3>Collection details</h3>\n            <div className="collection-voucher-header-grid">', 1)
t = t.replace('<label>Collection Date :</label>', '<label>Collection Date <span>*</span></label>').replace('<label>Col VNo. :</label>', '<label>Voucher No. <span>*</span></label>').replace('<label>Collection Type :</label>', '<label>Collection Type</label>')
t = t.replace('            <div className="collection-bottom-summary">', '            <div className="voucher-collection-bottom">\n' + narr.replace('<label>Narr :</label>', '<label>Narration</label>') + '\n            <div className="collection-bottom-summary">', 1)
t = t.replace('Total Collection Amount <b>', 'Total collection <b>').replace('Total Cash Collection <b>', 'Cash <b>').replace('Total Cheque Collection <b>', 'Cheque <b>').replace('Total Bills <b>', 'Selected bills <b>')
pos = t.rindex('          </div>')
t = t[:pos] + '            </div>\n          </section>\n' + t[pos:]
pos = t.rindex('        </div>')
t = t[:pos] + footer(cancel + '\n' + save) + '\n' + t[pos:]
t = t.replace('''                    <th>Bill Series</th>
                    <th>Bill No</th>
                    <th>Bill Date</th>
                    <th>Party Code</th>
                    <th>Party Name</th>''', '''                    <th>Bill / Date</th>
                    <th>Party / Code</th>''')
t = t.replace('>Bill Amt</th>', '>Bill Amt (₹)</th>').replace('>Old Collection</th>', '>Collected (₹)</th>').replace('>Balance</th>', '>Balance (₹)</th>').replace('<th>Collection Amt</th>', '<th>Collection (₹)</th>').replace('<th>Discount</th>', '<th>Discount (₹)</th>')
t = t.replace('''                    <th>REC Series</th>
                    <th>REC VNo</th>''', '                    <th>Receipt</th>')
t = t.replace('colSpan="13"', 'colSpan="9"').replace('Click Select button to load collection bills', 'Select bills, salesmen or areas to load outstanding bills')
t = t.replace('<tr key={item.id}>', '<tr key={item.id} className={item.selected ? "voucher-selected-row" : ""}>')
t = t.replace('''                        <td>{item.billSeries || "-"}</td>
                        <td>{item.billNo || "-"}</td>
                        <td>{item.billDate || "-"}</td>
                        <td>{item.partyCode || "-"}</td>
                        <td>{item.partyName || "-"}</td>''', '''                        <td><strong>{item.billSeries || "-"} / {item.billNo || "-"}</strong><small>{item.billDate || "-"}</small></td>
                        <td><strong>{item.partyName || "-"}</strong><small>{item.partyCode || "-"}</small></td>''')
t = t.replace('''                        <td>
                          <input
                            type="text"
                            className="table-input"
                            value={item.recSeries''', '''                        <td><div className="voucher-receipt-fields">
                          <input
                            aria-label="Receipt series"
                            type="text"
                            className="table-input"
                            value={item.recSeries''')
t = t.replace('''                        </td>

                        <td>
                          <input
                            type="text"
                            className="table-input"
                            value={item.recVNo''', '''                          <span>/</span>
                          <input
                            aria-label="Receipt voucher number"
                            type="text"
                            className="table-input"
                            value={item.recVNo''')
t = t.replace('''                            placeholder="VNo"
                            style={{ width: '80px' }}
                          />
                        </td>''', '''                            placeholder="VNo"
                            style={{ width: '80px' }}
                          />
                        </div></td>''')
s = s[:a] + t + s[b:]
p.write_text(s, encoding='utf-8', newline='\r\n')
