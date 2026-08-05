import React, { useMemo, useState } from "react";

const API_URL = "https://total-solution-backend.onrender.com/api";
  // const API_URL = "http://localhost:5000/api";

const SalesmanToAreaMapping = ({ companies = [], areas = [], salesmen = [] }) => {
  const [selectedCompanyCode, setSelectedCompanyCode] = useState("");
  const [loadedCompany, setLoadedCompany] = useState(null);
  const [mappingRows, setMappingRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
  };

  const styles = {
    page: {
      padding: "14px 32px 40px",
      background: "#f4f7fb",
      minHeight: "calc(100vh - 80px)",
      boxSizing: "border-box",
    },
    card: {
      background: "#ffffff",
      border: "1px solid #d9e2ef",
      borderRadius: "8px",
      padding: "18px",
      maxWidth: "1020px",
      margin: "0 auto",
      boxSizing: "border-box",
    },
    title: {
      margin: "0 0 14px",
      fontSize: "22px",
      fontWeight: "700",
      color: "#000",
    },
    filterBox: {
      display: "flex",
      alignItems: "flex-end",
      gap: "10px",
      padding: "12px",
      border: "1px solid #cfd8e3",
      borderRadius: "8px",
      marginBottom: "14px",
      background: "#fff",
      flexWrap: "wrap",
    },
    field: {
      display: "flex",
      flexDirection: "column",
    },
    label: {
      display: "block",
      fontSize: "12px",
      fontWeight: "700",
      marginBottom: "5px",
      color: "#000",
    },
    companySelect: {
      width: "360px",
      height: "32px",
      border: "1px solid #cbd5e1",
      borderRadius: "5px",
      padding: "0 8px",
      background: "#fff",
    },
    goBtn: {
      height: "32px",
      padding: "0 18px",
      border: "none",
      borderRadius: "5px",
      background: "#2563eb",
      color: "#fff",
      fontWeight: "600",
      cursor: "pointer",
    },
    resetBtn: {
      height: "32px",
      padding: "0 18px",
      borderRadius: "5px",
      background: "#f8fafc",
      color: "#111827",
      border: "1px solid #cbd5e1",
      fontWeight: "600",
      cursor: "pointer",
    },
    tableWrap: {
      border: "1px solid #cfd8e3",
      borderRadius: "8px",
      overflowX: "auto",
      background: "#fff",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "13px",
    },
    th: {
      background: "#f8fafc",
      borderRight: "1px solid #dbe3ec",
      borderBottom: "1px solid #cfd8e3",
      padding: "10px 12px",
      textAlign: "left",
      fontWeight: "700",
      color: "#000",
    },
    td: {
      borderRight: "1px solid #e2e8f0",
      borderBottom: "1px solid #e2e8f0",
      padding: "6px 12px",
      color: "#000",
    },
    srCol: {
      width: "60px",
      textAlign: "center",
    },
    areaCodeCol: {
      width: "140px",
    },
    salesmanCol: {
      width: "340px",
    },
    rowSelect: {
      width: "100%",
      height: "30px",
      border: "1px solid #cbd5e1",
      borderRadius: "5px",
      padding: "0 8px",
      background: "#fff",
    },
    empty: {
      textAlign: "center",
      fontStyle: "italic",
      padding: "16px",
      color: "#111827",
    },
    footer: {
      display: "flex",
      justifyContent: "flex-end",
      marginTop: "12px",
    },
    saveBtn: {
      height: "36px",
      padding: "0 18px",
      border: "none",
      borderRadius: "5px",
      background: "#16a34a",
      color: "#fff",
      fontWeight: "600",
      cursor: "pointer",
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Salesman To Area Mapping</h2>

        <div style={styles.filterBox}>
          <div style={styles.field}>
            <label style={styles.label}>COMPANY NAME</label>
            <select
              style={styles.companySelect}
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
          </div>

          <button
            type="button"
            style={styles.goBtn}
            onClick={handleGo}
            disabled={loading}
          >
            {loading ? "Loading..." : "Go"}
          </button>

          <button type="button" style={styles.resetBtn} onClick={handleReset}>
            Reset
          </button>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, ...styles.srCol }}>Sr</th>
                <th style={{ ...styles.th, ...styles.areaCodeCol }}>
                  Area Code
                </th>
                <th style={styles.th}>Area Name</th>
                <th style={{ ...styles.th, ...styles.salesmanCol }}>
                  Salesman Name
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={styles.empty}>
                    Loading mapping...
                  </td>
                </tr>
              ) : mappingRows.length === 0 ? (
                <tr>
                  <td colSpan="4" style={styles.empty}>
                    Select company and click Go to load area list.
                  </td>
                </tr>
              ) : (
                mappingRows.map((row, index) => (
                  <tr key={row.id}>
                    <td style={{ ...styles.td, ...styles.srCol }}>
                      {index + 1}
                    </td>
                    <td style={{ ...styles.td, ...styles.areaCodeCol }}>
                      {row.areaCode}
                    </td>
                    <td style={styles.td}>{row.areaName}</td>
                    <td style={{ ...styles.td, ...styles.salesmanCol }}>
                      <select
                        style={styles.rowSelect}
                        value={row.salesmanCode}
                        onChange={(e) =>
                          handleSalesmanChange(index, e.target.value)
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={styles.footer}>
          <button
            type="button"
            style={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? "Saving..." : "Save Mapping"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesmanToAreaMapping;
