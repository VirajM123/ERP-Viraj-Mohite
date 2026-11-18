import { useEffect, useMemo, useState } from "react";
import { Columns3, ListFilter } from "lucide-react";

const getColumnWidth = (column) => {
  if (column.key === "partyName" || column.key === "productName") return "180px";
  return column.type === "number" ? "92px" : "105px";
};

export default function CommonReportGrid({
  columns,
  rows,
  rowKey,
  renderValue,
  getTotal,
  columnFilters,
  onColumnFilterChange,
}) {
  const columnSignature = useMemo(
    () => columns.map((column) => column.key).join("|"),
    [columns]
  );
  const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => new Set(columns.map((column) => column.key)));
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showColumnFilters, setShowColumnFilters] = useState(false);
  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleColumnKeys.has(column.key)),
    [columns, visibleColumnKeys]
  );

  useEffect(() => {
    setVisibleColumnKeys(new Set(columns.map((column) => column.key)));
  }, [columnSignature, columns]);

  const toggleColumn = (key, checked) => {
    setVisibleColumnKeys((current) => {
      const next = new Set(current);
      if (checked) next.add(key);
      else if (next.size > 1) next.delete(key);
      return next;
    });
  };

  return (
    <div className="common-report-grid">
      <div className="common-report-grid-controls">
        <div className="common-report-grid-menu">
          <button
            type="button"
            className={showColumnMenu ? "active" : ""}
            aria-expanded={showColumnMenu}
            onClick={() => setShowColumnMenu((visible) => !visible)}
            title="Choose visible columns"
          >
            <Columns3 size={13} /> Columns
          </button>
          {showColumnMenu && (
            <div className="common-report-grid-column-menu">
              {columns.map((column) => (
                <label key={column.key}>
                  <input
                    type="checkbox"
                    checked={visibleColumnKeys.has(column.key)}
                    disabled={visibleColumnKeys.has(column.key) && visibleColumnKeys.size === 1}
                    onChange={(event) => toggleColumn(column.key, event.target.checked)}
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          className={showColumnFilters ? "active" : ""}
          aria-pressed={showColumnFilters}
          onClick={() => setShowColumnFilters((visible) => !visible)}
          title="Show or hide column filters"
        >
          <ListFilter size={13} /> Filter
        </button>
      </div>

      <div className="common-report-grid-scroll">
        <table className="party-report-table common-report-grid-table">
          <thead>
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className={column.type === "number" ? "party-report-number" : ""}
                  style={{ minWidth: getColumnWidth(column) }}
                  title={column.label}
                >
                  {column.label}
                </th>
              ))}
            </tr>
            {showColumnFilters && (
              <tr className="common-report-grid-filter-row">
                {visibleColumns.map((column) => (
                  <th key={column.key} className={column.type === "number" ? "party-report-number" : ""}>
                    <input
                      type="search"
                      aria-label={`Filter ${column.label}`}
                      placeholder="Filter"
                      value={columnFilters[column.key] || ""}
                      onChange={(event) => onColumnFilterChange(column.key, event.target.value)}
                    />
                  </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowKey(row, rowIndex)}>
                {visibleColumns.map((column) => (
                  <td
                    key={`${column.key}-${rowIndex}`}
                    className={column.type === "number" ? "party-report-number" : ""}
                    style={{ minWidth: getColumnWidth(column) }}
                    title={String(renderValue(column, row[column.key]))}
                  >
                    {renderValue(column, row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                {visibleColumns.map((column) => (
                  <td
                    key={column.key}
                    className={column.type === "number" ? "party-report-number" : ""}
                    style={{ minWidth: getColumnWidth(column) }}
                  >
                    {getTotal(column, columns.indexOf(column))}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
