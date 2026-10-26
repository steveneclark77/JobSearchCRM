import React from "react";

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
  return (
    <div
      className="opportunity-table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Opportunities list"
    >
      <table className="opportunity-table">
        <thead>
          <tr>
            <th scope="col">Company</th>
            <th scope="col">Status</th>
            <th scope="col">Last updated</th>
            <th scope="col">Next action</th>
            <th scope="col">Notes</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((opportunity) => {
            const application = records.find(
              (r) =>
                r.kind === "application" && r.opportunityId === opportunity.id,
            );
            const next = records
              .filter(
                (r) =>
                  r.kind === "todo" &&
                  r.opportunityId === opportunity.id &&
                  !r.completed,
              )
              .sort(
                (a, b) =>
                  (a.dueDate || "9999-12-31").localeCompare(
                    b.dueDate || "9999-12-31",
                  ) ||
                  a.createdAt.localeCompare(b.createdAt) ||
                  a.id.localeCompare(b.id),
              )[0];
            return (
              <tr key={opportunity.id}>
                <td>
                  <button
                    className="opportunity-title"
                    onClick={() => onOpen(opportunity.id)}
                  >
                    {opportunity.company}
                  </button>
                  <span className="table-company">{opportunity.title}</span>
                </td>
                <td>{badge(application?.status || "lead")}</td>
                <td className="table-date">
                  {updatedDate(opportunity.updatedAt)}
                </td>
                <td>
                  {next ? (
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
                  )}
                </td>
                <td>
                  <p className="opportunity-notes">
                    {opportunity.notes || (
                      <span className="table-placeholder">No notes</span>
                    )}
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
