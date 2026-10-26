import { test, expect } from "@playwright/test";

test("every opportunity column sorts both ways with missing values last", async ({
  page,
}) => {
  const companies = ["Beta", "acme 10", "Acme 2", "Delta"];
  const statuses = ["research", "interview", "lead", "pending"];
  const notes = ["Zebra", "apple", "", "Banana"];
  const dates = [
    "2026-10-01T12:00:00Z",
    "2026-09-30T12:00:00Z",
    "",
    "2026-10-02T12:00:00Z",
  ];
  const records = companies.flatMap((company, index) => [
    {
      id: `opportunity-${index}`,
      kind: "opportunity",
      company,
      title: `Position ${index}`,
      notes: notes[index],
      updatedAt: dates[index],
      createdAt: "2026-09-01T12:00:00Z",
      contactIds: [],
      contactId: "",
      status: "",
      history: [],
    },
    {
      id: `application-${index}`,
      kind: "application",
      opportunityId: `opportunity-${index}`,
      status: statuses[index],
      title: "",
      notes: "",
      contactIds: [],
    },
  ]);
  records.push(
    ...[
      {
        id: "task-a",
        kind: "todo",
        opportunityId: "opportunity-0",
        title: "Call recruiter",
        dueDate: "2026-11-01",
        createdAt: "2026-09-01T12:00:00Z",
        completed: false,
      },
      {
        id: "task-b",
        kind: "todo",
        opportunityId: "opportunity-1",
        title: "Send portfolio",
        dueDate: "2026-10-30",
        createdAt: "2026-09-01T12:00:00Z",
        completed: false,
      },
      {
        id: "task-c",
        kind: "todo",
        opportunityId: "opportunity-3",
        title: "Network",
        dueDate: "",
        createdAt: "2026-09-01T12:00:00Z",
        completed: false,
      },
    ],
  );
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({
      json:
        path === "/api/session"
          ? {
              email: "sorting@example.com",
              csrf: "test",
              setupRequired: false,
              mailEnabled: false,
            }
          : records,
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Opportunities", exact: true })
    .click();
  const table = page.getByRole("table", { name: "Opportunities" });
  const names = table.locator("tbody tr td:first-child button");
  await expect(names).toHaveText(companies);
  const company = table.getByRole("columnheader", {
    name: "Company",
    exact: true,
  });
  await company.getByRole("button").focus();
  await page.keyboard.press("Enter");
  await expect(company).toHaveAttribute("aria-sort", "ascending");
  await expect(names).toHaveText(["Acme 2", "acme 10", "Beta", "Delta"]);
  await page.keyboard.press("Space");
  await expect(company).toHaveAttribute("aria-sort", "descending");
  await expect(names).toHaveText(["Delta", "Beta", "acme 10", "Acme 2"]);
  for (const [label, ascending, descending] of [
    [
      "Status",
      ["acme 10", "Acme 2", "Delta", "Beta"],
      ["Beta", "Delta", "Acme 2", "acme 10"],
    ],
    [
      "Last updated",
      ["acme 10", "Beta", "Delta", "Acme 2"],
      ["Delta", "Beta", "acme 10", "Acme 2"],
    ],
    [
      "Next action",
      ["acme 10", "Beta", "Delta", "Acme 2"],
      ["Beta", "acme 10", "Delta", "Acme 2"],
    ],
    [
      "Notes",
      ["acme 10", "Delta", "Beta", "Acme 2"],
      ["Beta", "Delta", "acme 10", "Acme 2"],
    ],
  ]) {
    const header = table.getByRole("columnheader", {
      name: label,
      exact: true,
    });
    await header.getByRole("button").click();
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    await expect(names).toHaveText(ascending);
    await expect(company).toHaveAttribute("aria-sort", "none");
    await header.getByRole("button").click();
    await expect(header).toHaveAttribute("aria-sort", "descending");
    await expect(names).toHaveText(descending);
  }
  await page
    .getByRole("checkbox", { name: "Show closed and withdrawn", exact: true })
    .check();
  await expect(
    table.getByRole("columnheader", { name: "Notes", exact: true }),
  ).toHaveAttribute("aria-sort", "descending");
  await expect(names).toHaveText(["Beta", "Delta", "acme 10", "Acme 2"]);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await table
    .getByRole("columnheader", { name: "Company", exact: true })
    .getByRole("button")
    .click();
  await expect(names).toHaveText(["Acme 2", "acme 10", "Beta", "Delta"]);
  await names.first().click();
  await expect(
    page
      .getByRole("dialog", { name: "Record details" })
      .getByRole("heading", { name: "Position 2", exact: true }),
  ).toBeVisible();
});
