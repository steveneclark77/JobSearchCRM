import React from "react";
import SortableTable from "./SortableTable";
import {
  contactHistory,
  contactNextEvents,
  eventSummary,
  contactEventDate,
} from "./contactWorkflow";
export default function ContactsTable({
  contacts,
  records,
  onOpen,
  onLog,
  onSchedule,
}) {
  const rows = contacts.map((contact) => ({
    contact,
    name: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
    last: contactHistory(records, contact.id)[0],
    next: contactNextEvents(records, contact.id)[0],
  }));
  const columns = [
    {
      key: "contact",
      label: "Contact",
      value: (row) => row.name,
      render: ({ contact, name }) => (
        <>
          <button
            className="opportunity-title"
            onClick={() => onOpen(contact.id)}
          >
            {name}
          </button>
          <span className="table-company">
            {[contact.email, contact.phone].filter(Boolean).join(" · ")}
          </span>
        </>
      ),
    },
    {
      key: "company",
      label: "Company",
      value: (row) => row.contact.company,
      render: (row) =>
        row.contact.company || (
          <span className="table-placeholder">Not set</span>
        ),
    },
    {
      key: "last",
      label: "Last event",
      value: (row) =>
        row.last ? [row.last.occurredDate, row.last.createdAt] : null,
      render: ({ contact, last, name }) => (
        <>
          {last ? (
            <>
              <button
                className="next-action-button"
                onClick={() => onOpen(last.id)}
              >
                {eventSummary(last)}
              </button>
              <span className="table-company">
                {contactEventDate(last.occurredDate)}
              </span>
            </>
          ) : (
            <span className="table-placeholder">No events yet</span>
          )}
          <div className="contact-event-actions">
            <button
              className="text-button"
              aria-label={`Log event for ${name}`}
              onClick={() => onLog(contact)}
            >
              Log event
            </button>
          </div>
        </>
      ),
    },
    {
      key: "next",
      label: "Next event",
      value: (row) => (row.next ? [row.next.dueDate, row.next.title] : null),
      render: ({ contact, next, name }) => (
        <>
          {next ? (
            <>
              <button
                className="next-action-button"
                onClick={() => onOpen(next.id)}
              >
                {eventSummary(next)}
              </button>
              <span className="table-company">
                {contactEventDate(next.dueDate)}
              </span>
            </>
          ) : (
            <span className="table-placeholder">No event scheduled</span>
          )}
          <div className="contact-event-actions">
            <button
              className="text-button"
              aria-label={`Set next event for ${name}`}
              onClick={() => onSchedule(contact)}
            >
              Set next event
            </button>
          </div>
        </>
      ),
    },
  ];
  return (
    <div
      className="opportunity-table-scroll"
      tabIndex={0}
      role="region"
      aria-label="Contacts list"
    >
      <SortableTable
        className="opportunity-table contacts-table"
        label="Contacts"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.contact.id}
      />
    </div>
  );
}
