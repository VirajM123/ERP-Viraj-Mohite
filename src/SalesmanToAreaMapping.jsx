import React, { useState } from 'react';

const SalesmanToAreaMapping = () => {
  const [company, setCompany] = useState('ARGUS COSMETICS LTD');

  const rows = Array.from({ length: 16 }, (_, i) => ({
    id: i + 1,
    areaCode: `A${String(i + 1).padStart(3, '0')}`,
    areaName: `Area ${String.fromCharCode(65 + (i % 26))}${i > 25 ? i - 25 : ''}`,
    salesmanCode: `S${String(i + 1).padStart(3, '0')}`,
  }));

  const handleExport = () => {
    alert('Export functionality would trigger here.');
  };

  return (
    <div className="master-section erp-master-form">
      {/* Modern Header */}
      <div className="erp-header">
        <div>
          <div className="erp-title">Total Solutions – 101 – Total Solution</div>
          <div className="erp-subtitle">Salesman to Area Mapping</div>
        </div>
        <div className="erp-status">
          <span>101_2627 | 23/04/2026 | ADMIN | V 3.0.2 | ENG | 23:50 | IN</span>
        </div>
      </div>

      {/* Company Selector */}
      <div className="form-section">
        <div className="form-grid-3">
          <div className="labeled-input">
            <label>Company Name</label>
            <input
              type="text"
              className="erp-input"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div />
          <button className="btn-primary erp-btn-go" style={{alignSelf: 'end'}}>Go</button>
        </div>
      </div>

      {/* Modern Table */}
      <div className="erp-table-container">
        <table className="erp-table">
          <thead>
            <tr>
              <th style={{width: '15%'}}>Area Code</th>
              <th style={{width: '50%'}}>Area Name</th>
              <th style={{width: '25%'}}>Salesman Code</th>
              <th style={{width: '10%'}}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.areaCode}</td>
                <td>{row.areaName}</td>
                <td>{row.salesmanCode}</td>
                <td>
                  <button className="btn-secondary" style={{padding: '4px 8px', fontSize: '11px'}}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modern Action Buttons */}
      <div className="form-actions">
        <button className="btn-primary erp-btn-save" onClick={() => alert('Saved!')}>Save</button>
        <button className="btn-secondary erp-btn-cancel">Cancel</button>
        <button className="btn-secondary erp-btn-export" onClick={handleExport}>Export</button>
        <button className="btn-reset">Reset</button>
      </div>
    </div>
  );
};

export default SalesmanToAreaMapping;

