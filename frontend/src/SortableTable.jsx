import React, { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

const collator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});
const missing = (value) =>
  value == null ||
  value === "" ||
  (typeof value === "number" && Number.isNaN(value));

function compareValues(a, b, direction) {
  // Missing values stay last in either direction, including undated actions.
  if (missing(a) || missing(b)) return missing(a) ? (missing(b) ? 0 : 1) : -1;
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let index = 0; index < Math.max(a.length, b.length); index++) {
      const result = compareValues(a[index], b[index], direction);
      if (result) return result;
    }
    return 0;
  }
  const result =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : collator.compare(String(a), String(b));
  return direction === "ascending" ? result : -result;
}

export default function SortableTable({
  columns,
  rows,
  rowKey,
  className,
  label,
}) {
  const [sort, setSort] = useState({ key: null, direction: "ascending" });
  const column = columns.find((item) => item.key === sort.key);
  const sorted = column
    ? [...rows].sort((a, b) =>
        compareValues(column.value(a), column.value(b), sort.direction),
      )
    : rows;
  return (
    <table className={className} aria-label={label}>
      <thead>
        <tr>
          {columns.map((column) => {
            const active = sort.key === column.key;
            const direction = active ? sort.direction : "none";
            const nextDirection =
              active && sort.direction === "ascending"
                ? "descending"
                : "ascending";
            const Icon = active
              ? sort.direction === "ascending"
                ? ArrowUp
                : ArrowDown
              : ArrowUpDown;
            return (
              <th key={column.key} scope="col" aria-sort={direction}>
                <button
                  className="sortable-column"
                  type="button"
                  title={`Sort ${column.label.toLowerCase()} ${nextDirection}`}
                  onClick={() =>
                    setSort({ key: column.key, direction: nextDirection })
                  }
                >
                  {column.label}
                  <Icon size={13} aria-hidden="true" />
                </button>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row) => (
          <tr key={rowKey(row)}>
            {columns.map((column) => (
              <td key={column.key} className={column.className}>
                {column.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
