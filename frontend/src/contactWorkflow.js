export const eventTypes = [
  ["introduction", "Introduction"],
  ["follow-up", "Follow-up"],
  ["meeting", "Meeting"],
  ["email", "Email"],
  ["phone-call", "Phone call"],
  ["other", "Other"],
];
export const eventTypeLabel = (type) =>
  eventTypes.find(([key]) => key === type)?.[1] || "";
export const eventSummary = (event) => {
  const type = eventTypeLabel(event.eventType);
  const title = event.title || "";
  return type && title && type.toLowerCase() !== title.toLowerCase()
    ? `${type} · ${title}`
    : title || type || "Interaction";
};
export function contactHistory(records, contactId) {
  return records
    .filter(
      (record) =>
        record.kind === "interaction" && record.contactId === contactId,
    )
    .sort(
      (a, b) =>
        b.occurredDate.localeCompare(a.occurredDate) ||
        b.createdAt.localeCompare(a.createdAt) ||
        a.id.localeCompare(b.id),
    );
}
export function contactNextEvents(records, contactId) {
  return records
    .filter(
      (record) =>
        record.kind === "todo" &&
        record.contactId === contactId &&
        !record.completed,
    )
    .sort(
      (a, b) =>
        (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") ||
        a.createdAt.localeCompare(b.createdAt) ||
        a.id.localeCompare(b.id),
    );
}
export const contactEventDate = (date) =>
  date
    ? new Date(date + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No date";
