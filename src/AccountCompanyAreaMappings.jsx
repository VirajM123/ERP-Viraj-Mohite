import { useRef, useState } from 'react';
import { MapPinned, Save, X } from 'lucide-react';
import './AccountCompanyAreaMappings.css';

const companyCode = company => String(company?.companyCode || company?.code || '').trim();
const companyName = company => String(company?.companyName || company?.name || '').trim();
const areaCode = area => String(area?.areaCode || area?.code || area?.value || '').trim();
const areaName = area => String(area?.areaName || area?.name || area?.label || '').trim();

export default function AccountCompanyAreaMappings({ account, accountId, companies, areas, apiUrl, secureFetch, onApply }) {
  const dialog = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const mergeRows = saved => companies
    .filter(company => company?.isActive !== false)
    .map(company => {
      const code = companyCode(company);
      const existing = saved.find(row => String(row.companyCode || '').trim() === code) || {};
      return {
        companyCode: code,
        companyName: companyName(company),
        areaCode: existing.areaCode || '',
        areaName: existing.areaName || '',
        compaccode: existing.compaccode || '',
        compacname: existing.compacname || '',
      };
    });

  const open = async () => {
    setError('');
    dialog.current?.showModal();
    if (Array.isArray(account.companyAreaMappings)) {
      setRows(mergeRows(account.companyAreaMappings));
      return;
    }
    if (!accountId || !String(account.accountCode || '').trim()) {
      setRows(mergeRows([]));
      return;
    }
    setLoading(true);
    try {
      const response = await secureFetch(`${apiUrl}/account-company-area-mappings?accountCode=${encodeURIComponent(account.accountCode)}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Company area mappings could not be loaded.');
      setRows(mergeRows(result.mappings || []));
    } catch (loadError) {
      setRows([]);
      setError(loadError.message || 'Company area mappings could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (index, field, value) => setRows(previous => previous.map((row, rowIndex) => {
    if (rowIndex !== index) return row;
    if (field === 'areaCode') {
      const selected = areas.find(area => areaCode(area) === value);
      return { ...row, areaCode: value, areaName: selected ? areaName(selected) : '' };
    }
    return { ...row, [field]: value };
  }));

  const clearRow = index => setRows(previous => previous.map((row, rowIndex) => rowIndex === index
    ? { ...row, areaCode: '', areaName: '', compaccode: '', compacname: '' }
    : row));

  const apply = () => {
    const mapped = rows.filter(row => row.areaCode || row.compaccode || row.compacname);
    const incomplete = mapped.find(row => !row.areaCode || !row.compaccode.trim() || !row.compacname.trim());
    if (incomplete) {
      setError(`Complete Area, Company Account Code and Company Account Name for ${incomplete.companyName}.`);
      return;
    }
    onApply(mapped);
    dialog.current?.close();
  };

  return <>
    <button type="button" className="compact-btn account-area-trigger" onClick={open}>
      <MapPinned size={15} /> Area
    </button>
    <dialog ref={dialog} className="account-area-dialog" aria-labelledby="account-area-title" onCancel={() => setError('')}>
      <header>
        <div>
          <h2 id="account-area-title">Company Area Mapping</h2>
          <p>{account.accountCode || 'New account'} - {account.accountName || 'Enter account details'}</p>
        </div>
        <button type="button" aria-label="Close company area mapping" onClick={() => dialog.current?.close()}><X size={18} /></button>
      </header>
      <div className="account-area-body">
        <p className="account-area-help">Map this customer to an area and to the account code/name used by each company.</p>
        {loading ? <p role="status">Loading mappings...</p> : (
          <div className="account-area-table-wrap">
            <table>
              <thead><tr><th>Company Name</th><th>Area Name</th><th>Account Code (compaccode)</th><th>Account Name (compacname)</th><th /></tr></thead>
              <tbody>
                {rows.length ? rows.map((row, index) => <tr key={row.companyCode}>
                  <td><strong>{row.companyCode}</strong><span>{row.companyName}</span></td>
                  <td><select value={row.areaCode} onChange={event => updateRow(index, 'areaCode', event.target.value)}>
                    <option value="">Select Area</option>
                    {areas.map(area => <option key={areaCode(area)} value={areaCode(area)}>{areaName(area)}</option>)}
                  </select></td>
                  <td><input value={row.compaccode} onChange={event => updateRow(index, 'compaccode', event.target.value)} placeholder="Company account code" /></td>
                  <td><input value={row.compacname} onChange={event => updateRow(index, 'compacname', event.target.value)} placeholder="Company account name" /></td>
                  <td><button type="button" className="account-area-clear" onClick={() => clearRow(index)}>Clear</button></td>
                </tr>) : <tr><td colSpan="5" className="account-area-empty">No active companies are available.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {error && <p className="account-area-error" role="alert">{error}</p>}
      </div>
      <footer>
        <button type="button" className="compact-btn compact-btn-cancel" onClick={() => dialog.current?.close()}>Cancel</button>
        <button type="button" className="compact-btn compact-btn-primary" disabled={loading || Boolean(error && rows.length === 0)} onClick={apply}><Save size={15} /> Apply Mapping</button>
      </footer>
    </dialog>
  </>;
}
