import { test, expect } from "@playwright/test";

test("contacts show the latest event by event date and earliest incomplete next event", async ({
  page,
}) => {
  const base = {
    notes: "",
    title: "",
    contactIds: [],
    contactId: "",
    opportunityId: "",
    eventType: "",
    createdAt: "2026-10-20T12:00:00Z",
    email: "",
    phone: "",
    company: "Example",
    firstName: "",
    lastName: "",
  };
  const records = [
    { ...base, id: "ann", kind: "contact", firstName: "Ann", lastName: "Able" },
    {
      ...base,
      id: "ben",
      kind: "contact",
      firstName: "Ben",
      lastName: "Baker",
    },
    {
      ...base,
      id: "casey",
      kind: "contact",
      firstName: "Casey",
      lastName: "Clark",
    },
    {
      ...base,
      id: "intro",
      kind: "interaction",
      contactId: "ann",
      eventType: "introduction",
      occurredDate: "2026-10-25",
    },
    {
      ...base,
      id: "meeting",
      kind: "interaction",
      contactId: "ann",
      eventType: "meeting",
      title: "First meeting",
      occurredDate: "2026-10-26",
    },
    {
      ...base,
      id: "legacy",
      kind: "interaction",
      contactId: "ann",
      title: "Legacy call",
      occurredDate: "2026-10-24",
      createdAt: "2026-10-28T12:00:00Z",
    },
    {
      ...base,
      id: "email",
      kind: "interaction",
      contactId: "ben",
      eventType: "email",
      occurredDate: "2026-10-27",
    },
    {
      ...base,
      id: "completed",
      kind: "todo",
      contactId: "ann",
      eventType: "follow-up",
      title: "Already done",
      dueDate: "2026-10-27",
      completed: true,
    },
    {
      ...base,
      id: "next",
      kind: "todo",
      contactId: "ann",
      eventType: "follow-up",
      title: "Ask for referral",
      dueDate: "2026-10-29",
      completed: false,
    },
    {
      ...base,
      id: "later",
      kind: "todo",
      contactId: "ann",
      eventType: "meeting",
      title: "Team call",
      dueDate: "2026-11-02",
      completed: false,
    },
    {
      ...base,
      id: "undated",
      kind: "todo",
      contactId: "ann",
      title: "Undated legacy task",
      dueDate: "",
      completed: false,
    },
    {
      ...base,
      id: "ben-next",
      kind: "todo",
      contactId: "ben",
      eventType: "phone-call",
      title: "Phone call",
      dueDate: "2026-10-30",
      completed: false,
    },
  ];
  await page.route("**/api/**", (route) =>
    route.fulfill({
      json:
        new URL(route.request().url()).pathname === "/api/session"
          ? {
              email: "contact-test@example.com",
              csrf: "test",
              setupRequired: false,
              mailEnabled: false,
            }
          : records,
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Contacts", exact: true }).click();
  const table = page.getByRole("table", { name: "Contacts" });
  const ann = table.getByRole("row").filter({ hasText: "Ann Able" });
  await expect(
    ann.getByRole("button", { name: "Meeting · First meeting", exact: true }),
  ).toBeVisible();
  await expect(
    ann.getByRole("button", {
      name: "Follow-up · Ask for referral",
      exact: true,
    }),
  ).toBeVisible();
  await expect(ann.getByText("Oct 29, 2026", { exact: true })).toBeVisible();
  await expect(ann.getByText("Already done", { exact: true })).toHaveCount(0);
  await expect(ann.getByText("Legacy call", { exact: true })).toHaveCount(0);
  const names = table.locator("tbody tr td:first-child button");
  await table
    .getByRole("columnheader", { name: "Last event", exact: true })
    .getByRole("button")
    .click();
  await expect(names).toHaveText(["Ann Able", "Ben Baker", "Casey Clark"]);
  await table
    .getByRole("columnheader", { name: "Last event", exact: true })
    .getByRole("button")
    .click();
  await expect(names).toHaveText(["Ben Baker", "Ann Able", "Casey Clark"]);
  await table
    .getByRole("columnheader", { name: "Next event", exact: true })
    .getByRole("button")
    .click();
  await expect(names).toHaveText(["Ann Able", "Ben Baker", "Casey Clark"]);
  await table
    .getByRole("row")
    .filter({ hasText: "Ben Baker" })
    .getByRole("button", { name: "Email", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "Record details" })
      .getByRole("heading", { name: "Email", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close details", exact: true })
    .click();
  await ann.getByRole("button", { name: "Ann Able", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Record details" });
  await expect(detail.getByText("Legacy call", { exact: true })).toBeVisible();
  await expect(detail.locator(".task-label strong")).toHaveText([
    "Ask for referral",
    "Team call",
    "Undated legacy task",
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
