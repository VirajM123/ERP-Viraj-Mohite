import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  FileText,
  Pencil,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { API_URL } from "./api/config";
import "./Mapping.css";

const SalesmanToAreaMapping = ({ companies = [], areas = [], salesmen = [] }) => {
  const [selectedCompanyCode, setSelectedCompanyCode] = useState("");
  const [loadedCompany, setLoadedCompany] = useState(null);
  const [mappingRows, setMappingRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [listSearch, setListSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const getCompanyCode = (c) => c?.companyCode || c?.code || c?._id || c?.id || "";
  const getCompanyName = (c) => c?.companyName || c?.name || "";
  const getAreaCode = (a) => a?.areaCode || a?.code || "";
  const getAreaName = (a) => a?.areaName || a?.name || "";
  const getSalesmanCode = (s) => s?.salesmanCode || s?.code || "";
  const getSalesmanName = (s) => s?.salesmanName || s?.name || "";

  const salesmanOptions = useMemo(
    () =>
      salesmen.map((s) => ({
        code: getSalesmanCode(s),
        name: getSalesmanName(s),
      })),
    [salesmen]
  );

  const filteredRows = useMemo(() => {
    const query = listSearch.trim().toLowerCase();
    return mappingRows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(({ row }) => !query || [row.areaCode, row.areaName, row.salesmanCode, row.salesmanName]
        .some((value) => String(value || "").toLowerCase().includes(query)));
  }, [listSearch, mappingRows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / 10));
  const visibleRows = filteredRows.slice((currentPage - 1) * 10, currentPage * 10);

  const handleGo = async () => {
    if (!selectedCompanyCode) {
      alert("Please select company");
      return;
    }

    const company = companies.find(
      (c) => String(getCompanyCode(c)) === String(selectedCompanyCode)
    );

    if (!company) {
      alert("Selected company not found");
      return;
    }

    const distributorId = localStorage.getItem("distributorId");
    const firmId = localStorage.getItem("firmId");

    if (!distributorId || !firmId) {
      alert("Distributor/Firm not found. Please login again.");
      return;
    }

    setLoading(true);
    setLoadedCompany(company);
    setCurrentPage(1);

    const baseRows = areas.map((area, index) => ({
      id: `${getAreaCode(area)}_${index}`,
      areaCode: getAreaCode(area),
      areaName: getAreaName(area),
      salesmanCode: "",
      salesmanName: "",
    }));

    try {
      const res = await fetch(
        `${API_URL}/salesman-area-mappings?distributorId=${encodeURIComponent(
          distributorId
        )}&firmId=${encodeURIComponent(firmId)}&companyCode=${encodeURIComponent(
          getCompanyCode(company)
        )}`
      );

      const result = await res.json();
      const savedMappings = result?.mappings || [];

      const mergedRows = baseRows.map((row) => {
        const saved = savedMappings.find(
          (m) => String(m.areaCode) === String(row.areaCode)
        );

        return saved
          ? {
              ...row,
              salesmanCode: saved.salesmanCode || "",
              salesmanName: saved.salesmanName || "",
            }
          : row;
      });

      setMappingRows(mergedRows);
    } catch (error) {
      console.error(error);
      setMappingRows(baseRows);
    } finally {
      setLoading(false);
    }
  };

  const handleSalesmanChange = (rowIndex, salesmanCode) => {
    const salesman = salesmanOptions.find(
      (s) => String(s.code) === String(salesmanCode)
    );

    setMappingRows((prev) =>
      prev.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              salesmanCode,
              salesmanName: salesman?.name || "",
            }
          : row
      )
    );
  };

  const handleSave = async () => {
    if (!loadedCompany) {
      alert("Please select company and click Go");
      return;
    }

    const mappedRows = mappingRows.filter((row) => row.salesmanCode);

    if (mappedRows.length === 0) {
      alert("Please select at least one salesman");
      return;
    }

    const distributorId = localStorage.getItem("distributorId");
    const firmId = localStorage.getItem("firmId");
    const firmName = localStorage.getItem("firmName");

    if (!distributorId || !firmId) {
      alert("Distributor/Firm not found. Please login again.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`${API_URL}/salesman-area-mappings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyCode: getCompanyCode(loadedCompany),
          companyName: getCompanyName(loadedCompany),
          distributorId,
          firmId,
          firmName,
          mappings: mappedRows.map((row) => ({
            areaCode: row.areaCode,
            areaName: row.areaName,
            salesmanCode: row.salesmanCode,
            salesmanName: row.salesmanName,
          })),
        }),
      });

      const result = await res.json();

      if (!res.ok || result.success === false) {
        alert(result.message || "Mapping save failed");
        return;
      }

      alert("Salesman to Area mapping saved successfully!");
    } catch (error) {
      console.error("Mapping save error:", error);
      alert("Backend server is not running.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSelectedCompanyCode("");
    setLoadedCompany(null);
    setMappingRows([]);
    setListSearch("");
    setCurrentPage(1);
  };

  return (
    <section className="mapping-page mapping-salesman-page">
      <div className="mapping-toolbar">
        <div className="mapping-page-header">
          <div className="mapping-title-block">
            <h1>Salesman To Area Mapping</h1>
            <p>Assign areas to each salesman</p>
          </div>

          <div className="mapping-header-controls">
            <label htmlFor="salesman-area-company">Company</label>
            <div className="mapping-company-actions">
              <select
                id="salesman-area-company"
                className="mapping-company-select"
                value={selectedCompanyCode}
                onChange={(e) => setSelectedCompanyCode(e.target.value)}
              >
                <option value="">Select Company</option>
                {companies.map((company) => (
                  <option
                    key={getCompanyCode(company)}
                    value={getCompanyCode(company)}
                  >
                    {getCompanyName(company)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="mapping-button mapping-go-button"
                onClick={handleGo}
                disabled={loading}
              >
                {loading ? "Loading..." : "Go"}
              </button>
            </div>
          </div>
          <div className="mapping-header-actions">
            <button
              type="button"
              className="mapping-button mapping-button-primary"
              onClick={handleSave}
              disabled={saving || loading}
            >
              <Plus size={14} />{saving ? "Saving..." : "Save Mapping"}
            </button>
            <button type="button" className="mapping-button mapping-export-button"><FileSpreadsheet size={14} />Export Excel</button>
            <button type="button" className="mapping-button mapping-export-button"><FileText size={14} />Export PDF</button>
            <button type="button" className="mapping-button mapping-export-button"><Printer size={14} />Print List</button>
          </div>
        </div>

        <div className="mapping-search-row">
          <label className="mapping-search-box">
            <Search size={15} />
            <input
              type="search"
              placeholder="Search salesman, area code or area name..."
              value={listSearch}
              onChange={(event) => {
                setListSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
          <button type="button" className="mapping-button mapping-filter-button" onClick={handleReset}>
            <SlidersHorizontal size={14} />Apply Filter<ChevronDown size={14} />
          </button>
        </div>
      </div>

      <div className="mapping-table-card">
        <div className="mapping-table-wrap">
          <table className="mapping-list-table">
            <thead>
              <tr>
                <th className="mapping-sr-column">Sr No.</th>
                <th className="mapping-code-column">Area Code</th>
                <th>Area Name</th>
                <th className="mapping-code-column">Salesman Code</th>
                <th className="mapping-person-column">Salesman Name</th>
                <th className="mapping-status-column">Status</th>
                <th className="mapping-actions-column">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="mapping-empty-cell">
                    Loading mapping...
                  </td>
                </tr>
              ) : mappingRows.length === 0 ? (
                <tr>
                  <td colSpan="7" className="mapping-empty-cell">
                    Select company and click Go to load area list.
                  </td>
                </tr>
              ) : (
                visibleRows.map(({ row, originalIndex }, index) => (
                  <tr key={row.id}>
                    <td className="mapping-sr-column">{(currentPage - 1) * 10 + index + 1}</td>
                    <td>{row.areaCode}</td>
                    <td>{row.areaName}</td>
                    <td>{row.salesmanCode || <span className="mapping-muted-value">—</span>}</td>
                    <td>
                      <select
                        className="mapping-row-select"
                        value={row.salesmanCode}
                        onChange={(e) =>
                          handleSalesmanChange(originalIndex, e.target.value)
                        }
                      >
                        <option value="">Select Salesman</option>
                        {salesmanOptions.map((salesman) => (
                          <option key={salesman.code} value={salesman.code}>
                            {salesman.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className={`mapping-status ${row.salesmanCode ? "is-complete" : "is-pending"}`}>
                        <i />{row.salesmanCode ? "Active" : "Pending"}
                      </span>
                    </td>
                    <td>
                      <div className="mapping-row-actions">
                        <button type="button" aria-label={`View ${row.areaName}`}><Eye size={14} /></button>
                        <button type="button" aria-label={`Edit ${row.areaName}`} onClick={(event) => event.currentTarget.closest("tr")?.querySelector("select")?.focus()}><Pencil size={14} /></button>
                        <button type="button" className="is-delete" aria-label={`Clear ${row.areaName}`} onClick={() => handleSalesmanChange(originalIndex, "")}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mapping-table-footer">
          <span>
            {mappingRows.length
              ? `Showing ${(currentPage - 1) * 10 + 1} to ${Math.min(currentPage * 10, filteredRows.length)} of ${filteredRows.length} entries`
              : "Showing 0 entries"}
          </span>
          <div className="mapping-pagination">
            <select aria-label="Rows per page" defaultValue="10"><option>10</option></select>
            <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><ChevronLeft size={15} /></button>
            {Array.from({ length: totalPages }, (_, pageIndex) => pageIndex + 1).slice(0, 5).map((page) => (
              <button type="button" key={page} className={currentPage === page ? "is-current" : ""} onClick={() => setCurrentPage(page)}>{page}</button>
            ))}
            {totalPages > 6 && <span>...</span>}
            {totalPages > 5 && <button type="button" className={currentPage === totalPages ? "is-current" : ""} onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>}
            <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}><ChevronRight size={15} /></button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SalesmanToAreaMapping;
