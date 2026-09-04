import { useEffect } from "react";

const LIST_TABLE_SELECTOR =
  ".erp-master-list-page .erp-list-table, .erp-transaction-list-page table";

const ACTION_HEADER_SELECTOR = [
  ".firm-ui-action-column",
  ".user-ui-action-column",
  ".actions-col",
  '[class*="actions-column"]',
  '[class*="action-column"]',
].join(",");

const getComparableValue = (cell) => {
  const rawValue = (cell?.dataset.sortValue || cell?.textContent || "").trim();
  const normalized = rawValue.replace(/\s+/g, " ");

  if (!normalized || normalized === "-") {
    return { type: "empty", value: "" };
  }

  // Keep common ERP dates in chronological order instead of alphabetic order.
  const dateMatch = normalized.match(
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})(?:\s+.*)?$/
  );
  if (dateMatch) {
    const [, day, month, shortYear] = dateMatch;
    const year = Number(shortYear) < 100 ? 2000 + Number(shortYear) : Number(shortYear);
    return {
      type: "number",
      value: new Date(year, Number(month) - 1, Number(day)).getTime(),
    };
  }

  const numericValue = normalized
    .replace(/[₹$€£,%]/g, "")
    .replace(/,/g, "")
    .replace(/^\((.*)\)$/, "-$1")
    .trim();

  if (/^-?\d+(?:\.\d+)?$/.test(numericValue)) {
    return { type: "number", value: Number(numericValue) };
  }

  return { type: "text", value: normalized };
};

const compareValues = (left, right, direction) => {
  if (left.type === "empty" || right.type === "empty") {
    if (left.type === right.type) return 0;
    return left.type === "empty" ? 1 : -1;
  }

  const result =
    left.type === "number" && right.type === "number"
      ? left.value - right.value
      : String(left.value).localeCompare(String(right.value), undefined, {
          numeric: true,
          sensitivity: "base",
        });

  return direction === "ascending" ? result : -result;
};

const isSortableHeader = (header) => {
  if (!(header instanceof HTMLTableCellElement)) return false;
  if (!header.closest(LIST_TABLE_SELECTOR)) return false;
  if (header.matches(ACTION_HEADER_SELECTOR)) return false;
  if (/^actions?$/i.test(header.textContent.trim())) return false;
  if (header.querySelector('input[type="checkbox"]')) return false;
  return header.cellIndex >= 0;
};

const prepareHeaders = (root = document) => {
  root.querySelectorAll(`${LIST_TABLE_SELECTOR} thead th`).forEach((header) => {
    if (!isSortableHeader(header)) return;
    header.classList.add("erp-sortable-header");
    header.tabIndex = 0;
    header.setAttribute("role", "columnheader");
    if (!header.hasAttribute("aria-sort")) header.setAttribute("aria-sort", "none");
    if (!header.title) header.title = "Click to sort";
  });
};

const sortFromHeader = (header) => {
  if (!isSortableHeader(header)) return;

  const table = header.closest("table");
  const body = table?.tBodies?.[0];
  if (!body) return;

  const currentDirection = header.getAttribute("aria-sort");
  const nextDirection = currentDirection === "ascending" ? "descending" : "ascending";
  const rows = Array.from(body.rows);
  const sortableRows = rows.filter(
    (row) => row.cells.length > header.cellIndex && !row.cells[0]?.hasAttribute("colspan")
  );
  const fixedRows = rows.filter((row) => !sortableRows.includes(row));

  sortableRows.sort((leftRow, rightRow) => {
    const left = getComparableValue(leftRow.cells[header.cellIndex]);
    const right = getComparableValue(rightRow.cells[header.cellIndex]);
    return compareValues(left, right, nextDirection);
  });

  table.querySelectorAll("thead th[aria-sort]").forEach((candidate) => {
    candidate.setAttribute("aria-sort", candidate === header ? nextDirection : "none");
  });

  const fragment = document.createDocumentFragment();
  [...sortableRows, ...fixedRows].forEach((row) => fragment.appendChild(row));
  body.appendChild(fragment);
};

/** Adds shared click and keyboard sorting to every ERP list table. */
export const useSortableListTables = () => {
  useEffect(() => {
    prepareHeaders();

    const handleClick = (event) => {
      if (event.target.closest("button, input, select, a")) return;
      const header = event.target.closest("th");
      if (header) sortFromHeader(header);
    };

    const handleKeyDown = (event) => {
      const header = event.target.closest("th.erp-sortable-header");
      if (!header || !["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      sortFromHeader(header);
    };

    let prepareFrame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(prepareFrame);
      prepareFrame = requestAnimationFrame(() => prepareHeaders());
    });

    observer.observe(document.getElementById("root") || document.body, {
      childList: true,
      subtree: true,
    });
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(prepareFrame);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
};

