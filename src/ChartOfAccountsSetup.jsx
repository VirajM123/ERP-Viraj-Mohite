import { useCallback, useEffect, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { API_ROOT } from "./api/config";
import { secureFetch } from "./SecuritySetup";

const EMPTY_MAPPING = {
  accountType: "",
  normalSide: "",
  cashBankType: "NONE",
  taxControlType: "NONE",
  postingRole: "",
};

const ACCOUNT_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];
const POSTING_ROLES = [
  ["", "No special role"],
  ["SERVICE_REVENUE", "Service revenue"],
  ["OUTPUT_GST", "Output GST"],
  ["CASH", "Cash"],
  ["BANK", "Bank"],
  ["BANK_CHARGES", "Bank charges"],
];

export default function ChartOfAccountsSetup({ onClose }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingCode, setSavingCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await secureFetch(`${API_ROOT}/api/p0/chart-of-accounts`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Chart of accounts could not be loaded.");
      setAccounts((result.accounts || []).map((account) => ({
        ...EMPTY_MAPPING,
        ...account,
        postingRole: account.postingRole || "",
      })));
    } catch (loadError) {
      setError(loadError.message || "Chart of accounts could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const updateAccount = (accountCode, field, value) => {
    setAccounts((current) => current.map((account) => (
      account.accountCode === accountCode ? { ...account, [field]: value } : account
    )));
  };

  const saveAccount = async (account) => {
    setSavingCode(account.accountCode);
    setError("");
    setMessage("");
    try {
      const response = await secureFetch(
        `${API_ROOT}/api/p0/chart-of-accounts/${encodeURIComponent(account.accountCode)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountName: account.accountName,
            accountType: account.accountType,
            normalSide: account.normalSide,
            cashBankType: account.cashBankType,
            taxControlType: account.taxControlType,
            postingRole: account.postingRole,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Account classification could not be saved.");
      setAccounts((current) => current.map((row) => (
        row.accountCode === account.accountCode ? { ...row, mapped: true } : row
      )));
      setMessage(`Saved classification for ${account.accountCode}.`);
    } catch (saveError) {
      setError(saveError.message || "Account classification could not be saved.");
    } finally {
      setSavingCode("");
    }
  };

  return (
    <section className="chart-setup-panel" aria-label="Chart of accounts setup">
      <header className="chart-setup-header">
        <div>
          <h2>Chart of Accounts Setup</h2>
          <p>Classify accounts before generating Trial Balance, Profit &amp; Loss, Balance Sheet, Cash Book, or Bank Book.</p>
        </div>
        <div className="chart-setup-actions">
          <button type="button" className="report-clear-button" onClick={loadAccounts} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button type="button" className="report-clear-button" onClick={onClose} aria-label="Close chart setup">
            <X size={15} /> Close
          </button>
        </div>
      </header>
      {error && <div className="party-report-error" role="alert">{error}</div>}
      {message && <div className="chart-setup-success" role="status">{message}</div>}
      {loading ? <p className="chart-setup-empty"><span className="erp-loading-bar erp-loading-bar--inline" aria-hidden="true" /> Loading account codes...</p> : accounts.length === 0 ? (
        <p className="chart-setup-empty">No journal or master account codes were found for this firm.</p>
      ) : (
        <div className="chart-setup-table-wrap">
          <table className="party-report-table chart-setup-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Account Name</th>
                <th>Classification</th>
                <th>Normal Side</th>
                <th>Cash / Bank</th>
                <th>Tax Control</th>
                <th>Posting Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.accountCode}>
                  <td>{account.accountCode}</td>
                  <td>{account.accountName}</td>
                  <td>
                    <select aria-label={`${account.accountCode} classification`} value={account.accountType} onChange={(event) => updateAccount(account.accountCode, "accountType", event.target.value)}>
                      <option value="">Select type</option>
                      {ACCOUNT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </td>
                  <td>
                    <select aria-label={`${account.accountCode} normal side`} value={account.normalSide} onChange={(event) => updateAccount(account.accountCode, "normalSide", event.target.value)}>
                      <option value="">Select side</option>
                      <option value="DEBIT">DEBIT</option>
                      <option value="CREDIT">CREDIT</option>
                    </select>
                  </td>
                  <td>
                    <select aria-label={`${account.accountCode} cash or bank`} value={account.cashBankType} onChange={(event) => updateAccount(account.accountCode, "cashBankType", event.target.value)}>
                      <option value="NONE">None</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK">Bank</option>
                    </select>
                  </td>
                  <td>
                    <select aria-label={`${account.accountCode} tax control`} value={account.taxControlType} onChange={(event) => updateAccount(account.accountCode, "taxControlType", event.target.value)}>
                      <option value="NONE">None</option>
                      <option value="GST_INPUT">Input GST</option>
                      <option value="GST_OUTPUT">Output GST</option>
                    </select>
                  </td>
                  <td>
                    <select aria-label={`${account.accountCode} posting role`} value={account.postingRole} onChange={(event) => updateAccount(account.accountCode, "postingRole", event.target.value)}>
                      {POSTING_ROLES.map(([value, label]) => <option key={value || "none"} value={value}>{label}</option>)}
                    </select>
                  </td>
                  <td>{account.mapped ? "Mapped" : "Needs mapping"}</td>
                  <td>
                    <button type="button" className="report-clear-button" onClick={() => saveAccount(account)} disabled={savingCode === account.accountCode || loading}>
                      <Check size={14} /> {savingCode === account.accountCode ? <><span className="erp-loading-bar erp-loading-bar--inline" aria-hidden="true" /> Saving...</> : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
