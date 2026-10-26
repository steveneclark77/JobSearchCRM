import React from "react";
import SortableTable from "./SortableTable";

function updatedDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "Not recorded";
  return new Date(value).toLocaleDateString("en-US", {
    timeZone: "America/Los_Angeles",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OpportunityTable({
  opportunities,
  records,
  onOpen,
  badge,
  dateLabel,
}) {
  const rows = opportunities.map((opportunity) => {
    const application = records.find(
      (record) =>
        record.kind === "application" &&
        record.opportunityId === opportunity.id,
    );
    const next = records
      .filter(
        (record) =>
          record.kind === "todo" &&
          record.opportunityId === opportunity.id &&
          !record.completed,
      )
      .sort(
        (a, b) =>
          (a.dueDate || "9999-12-31").localeCompare(
            b.dueDate || "9999-12-31",
          ) ||
          a.createdAt.localeCompare(b.createdAt) ||
          a.id.localeCompare(b.id),
      )[0];
    return { opportunity, status: application?.status || "lead", next };
  });
  const columns = [
    {
      key: "company",
      label: "Company",
      value: (row) => row.opportunity.company,
      render: ({ opportunity }) => (
        <>
          <button
            className="opportunity-title"
            onClick={() => onOpen(opportunity.id)}
          >
            {opportunity.company}
          </button>
          <span className="table-company">{opportunity.title}</span>
        </>
      ),
    },
    {
      key: "status",
      label: "Status",
      value: (row) => row.status,
      render: (row) => badge(row.status),
    },
    {
      key: "updated",
      label: "Last updated",
      className: "table-date",
      value: (row) =>
        row.opportunity.updatedAt
          ? Date.parse(row.opportunity.updatedAt)
          : null,
      render: (row) => updatedDate(row.opportunity.updatedAt),
    },
    {
      key: "next",
      label: "Next action",
      value: (row) => (row.next ? [row.next.dueDate, row.next.title] : null),
      render: ({ next }) =>
        next ? (
          <>
            <button
              className="next-action-button"
              onClick={() => onOpen(next.id)}
            >
              {next.title}
            </button>
            <span className="table-company">
              {next.dueDate ? dateLabel(next.dueDate) : "No due date"}
            </span>
          </>
        ) : (
          <span className="table-placeholder">No next action</span>
        ),
    },
    {
      key: "notes",
      label: "Notes",
      value: (row) => row.opportunity.notes,
      render: (row) => (
        <p className="opportunity-notes">
          {row.opportunity.notes || (
            <span className="table-placeholder">No notes</span>
          )}
        </p>
      ),
    },
  ];
  return (
    <div
      className="opportunity-table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Opportunities list"
    >
      <SortableTable
        className="opportunity-table"
        label="Opportunities"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.opportunity.id}
      />
    </div>
  );
}
