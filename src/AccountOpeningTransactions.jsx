import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ReceiptText, Trash2, X } from 'lucide-react';
import { businessDateIST } from './utils/businessDate';
import { OPENING_TRANSACTION_TYPES, openingTransactionTotals, validateOpeningTransactions } from '../shared/openingTransactions';
import './AccountOpeningTransactions.css';
import { secureFetch } from './SecuritySetup';
import { API_URL } from './api/config';

export default function AccountOpeningTransactions({ account, accountId, onApply }) {
  const dialog = useRef(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const requests = useRef(new Map());
  const generation = useRef(0);
  const applied = useRef(false);
  const decorate = row => ({ ...row, clientKey: globalThis.crypto.randomUUID() });
  const totals = openingTransactionTotals(rows);
  const openingTotals = openingTransactionTotals(rows.filter(row => row.mode !== 'EXISTING'));
  const addRow = () => setRows(previous => [...previous, decorate({
    transactionType: 'SAL', transactionSeries: '', transactionNo: '',
    date: account.openingDate || businessDateIST(), originalAmount: '', balanceAmount: '',
    balanceType: 'Dr', company: '', salesman: '', areaName: account.town || '',
    adjusted: 'N', appeared: 'M',
    mode: 'OPENING',
  })]);
  const updateRow = (index, field, value) => {
    setRows(previous => previous.map((row, position) => position === index ? {
      ...row, [field]: value,
      ...(['transactionType', 'transactionSeries', 'transactionNo'].includes(field) ? { mode: 'OPENING', sourceId: '', lookupMessage: '' } : {}),
    } : row));
    setError('');
  };
  const open = async () => {
    const currentGeneration = ++generation.current;
    requests.current.clear();
    setRows((account.openingTransactions || []).map(decorate));
    setError('');
    setLoadFailed(false);
    dialog.current.showModal();
    if (!accountId || applied.current) return;
    setLoading(true);
    try {
      const response = await secureFetch(`${API_URL}/opening-transactions/account/${accountId}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Opening transactions could not be loaded.');
      if (currentGeneration === generation.current && (result.managed || result.data.length)) setRows(result.data.map(decorate));
    } catch (error) { if (currentGeneration === generation.current) { setError(error.message); setLoadFailed(true); } }
    finally { if (currentGeneration === generation.current) setLoading(false); }
  };
  const lookup = async row => {
    if (!String(row.transactionNo || '').trim() || row.transactionType === 'OPB') return;
    if (!account.accountCode) return setError('Enter an Account Code before loading a transaction.');
    const token = Symbol();
    requests.current.set(row.clientKey, token);
    const signature = item => [item.transactionType, item.transactionSeries, item.transactionNo].join('\u0000');
    setRows(previous => previous.map(item => item.clientKey === row.clientKey ? { ...item, lookupMessage: 'Loading...' } : item));
    try {
      const query = new URLSearchParams({ accountCode: account.accountCode, transactionType: row.transactionType, transactionSeries: row.transactionSeries, transactionNo: row.transactionNo });
      const response = await secureFetch(`${API_URL}/opening-transactions/lookup?${query}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Transaction lookup failed.');
      if (requests.current.get(row.clientKey) !== token) return;
      setRows(previous => previous.map(item => item.clientKey === row.clientKey && signature(item) === signature(row)
        ? { ...item, ...(result.found ? result.data : { mode: 'OPENING', sourceId: '' }), lookupMessage: result.message } : item));
    } catch (error) {
      if (requests.current.get(row.clientKey) === token) setError(error.message);
    } finally { if (requests.current.get(row.clientKey) === token) requests.current.delete(row.clientKey); }
  };
  const apply = event => {
    event.preventDefault();
    if (loadFailed) return setError('Saved opening transactions could not be loaded. Close and reopen this window to retry.');
    if (loading || requests.current.size) return setError('Wait for transaction details to finish loading.');
    const message = validateOpeningTransactions(rows);
    if (message) return setError(message);
    if (rows.some(row => row.mode !== 'EXISTING') && !account.openingDate) return setError('Set the account Opening Date before applying brought-forward transactions.');
    applied.current = true;
    const updateBalance = rows.some(row => row.mode !== 'EXISTING') || (account.openingTransactions || []).some(row => row.mode === 'OPENING');
    onApply(rows.map(({ clientKey, lookupMessage, ...row }) => ({ ...row, originalAmount: Number(row.originalAmount), balanceAmount: Number(row.balanceAmount) })), updateBalance ? openingTotals : null);
    dialog.current.close();
  };
  const fields = [
    ['transactionType', 'Trn', OPENING_TRANSACTION_TYPES], ['transactionSeries', 'Trn Series'],
    ['transactionNo', 'Trn No'], ['date', 'Date'], ['originalAmount', 'Original Amt'],
    ['balanceAmount', 'Balance Amt'], ['balanceType', 'Dr / Cr', ['Dr', 'Cr']],
    ['company', 'Company'], ['salesman', 'Salesman'], ['areaName', 'Area Name'],
    ['adjusted', 'Adjusted', ['Y', 'N']], ['appeared', 'Appeared'],
  ];
  return <>
    <button type="button" className="compact-btn account-opening-trigger" onClick={open}>
      <ReceiptText size={15} /> Set Opening Balance Transaction Wise
    </button>
    {createPortal(<dialog ref={dialog} className="account-opening-dialog" aria-labelledby="account-opening-title"
      onKeyDown={event => event.stopPropagation()}>
      <form onSubmit={apply}>
        <header>
          <div><h2 id="account-opening-title">Opening Transactions</h2>
            <p>Party: {account.accountCode || 'New account'} — {account.accountName || 'Enter account name'}</p></div>
          <button type="button" className="account-opening-icon" aria-label="Close opening transactions" onClick={() => dialog.current.close()}><X size={18} /></button>
        </header>
        <div className="account-opening-content">
          <p className="account-opening-hint">Enter Trn, Series and No, then press Tab or Load to fetch an existing document for this account. Existing documents are linked without posting twice. Unmatched references are brought-forward balances posted on the account Opening Date: <strong>{account.openingDate || 'not set'}</strong>.</p>
          <p className="account-opening-hint">Apply, then Save / Update Account to post. Opening entries update the ledger and outstanding; they do not create sales, purchase, GST or stock movements.</p>
          {loading && <p role="status">Loading saved opening transactions...</p>}
          <fieldset disabled={loading || loadFailed} className="account-opening-fields">
          <div className="account-opening-table-scroll">
            <table><thead><tr>{fields.map(([field, label]) => <th key={field}>{label}</th>)}<th>Document / Status</th><th>Remove</th></tr></thead>
              <tbody>{rows.length === 0 ? <tr><td colSpan={14} className="account-opening-empty">No opening transactions. Add a transaction to begin.</td></tr> : rows.map((row, index) => <tr key={row.clientKey}>
                {fields.map(([field, label, options]) => <td key={field}>
                  {options ? <select aria-label={`${label}, row ${index + 1}`} value={row[field]} disabled={row.mode === 'EXISTING' && field !== 'transactionType'} onBlur={() => field === 'transactionType' && lookup(row)} onChange={event => updateRow(index, field, event.target.value)}>
                    {options.map(option => <option key={option}>{option}</option>)}
                  </select> : <input aria-label={`${label}, row ${index + 1}`} value={row[field] ?? ''}
                    type={field === 'date' ? 'date' : field.endsWith('Amount') ? 'number' : 'text'}
                    min={field.endsWith('Amount') ? '0' : undefined} step={field.endsWith('Amount') ? '0.01' : undefined}
                    required={['transactionNo', 'date', 'originalAmount', 'balanceAmount'].includes(field)}
                    readOnly={row.mode === 'EXISTING' && !['transactionSeries', 'transactionNo'].includes(field)}
                    onBlur={() => ['transactionSeries', 'transactionNo'].includes(field) && lookup(row)}
                    onKeyDown={event => { if (event.key === 'Enter' && ['transactionSeries', 'transactionNo'].includes(field)) { event.preventDefault(); lookup(row); } }}
                    onChange={event => updateRow(index, field, event.target.value)} />}
                </td>)}
                <td className="account-opening-lookup"><button type="button" className="compact-btn account-opening-trigger" onClick={() => lookup(row)} disabled={row.transactionType === 'OPB'}>Load</button><small>{row.mode === 'EXISTING' ? 'Existing document — no new posting' : 'Brought forward'}{Number(row.allocatedAmount) > 0 ? ` · Allocated: ${Number(row.allocatedAmount).toFixed(2)}` : ''}</small><small role="status">{row.lookupMessage}</small></td>
                <td><button type="button" className="account-opening-icon" aria-label={`Remove transaction ${index + 1}`} onClick={() => setRows(previous => previous.filter((_, position) => position !== index))}><Trash2 size={15} /></button></td>
              </tr>)}</tbody></table>
          </div>
          <button type="button" className="compact-btn account-opening-trigger" onClick={addRow}><Plus size={15} /> Add Transaction</button>
          </fieldset>
          <div className="account-opening-totals">
            <div>Opening Balance<strong>{account.openingBal || '0.00'} {account.openingBalType || 'Dr'}</strong></div>
            <div>Total Dr<strong>{totals.debit.toFixed(2)}</strong></div>
            <div>Total Cr<strong>{totals.credit.toFixed(2)}</strong></div>
            <div>Total Dr − Cr<strong>{Math.abs(totals.net).toFixed(2)} {totals.net < 0 ? 'Cr' : 'Dr'}</strong></div>
          </div>
          <p><strong>Brought-forward balance to post: {Math.abs(openingTotals.net).toFixed(2)} {openingTotals.net < 0 ? 'Cr' : 'Dr'}</strong> (excludes linked documents)</p>
          {error && <p role="alert" className="account-opening-error">{error}</p>}
        </div>
        <footer><button type="button" className="compact-btn compact-btn-cancel" onClick={() => dialog.current.close()}>Cancel</button>
          <button type="submit" className="compact-btn compact-btn-primary">Apply Transactions</button></footer>
      </form>
    </dialog>, document.body)}
  </>;
}
