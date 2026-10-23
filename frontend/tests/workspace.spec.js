import { test, expect } from "@playwright/test";

test("personal job search, relationships, follow-ups, search, backup and restore", async ({
  page,
}) => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make yourself at home." }),
  ).toBeVisible();
  await page.getByLabel("Email address").fill("browser-test@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("a browser test password 123");
  await page.getByRole("button", { name: "Create my workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Make room for what’s next." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Contacts", exact: true }).click();
  await page.getByRole("button", { name: "Add contact" }).first().click();
  let dialog = page.getByRole("dialog", { name: "Add contact" });
  await dialog.getByLabel("First name").fill("Alex");
  await dialog.getByLabel("Last name").fill("Rivera");
  await dialog.getByLabel("Email address").fill("alex@example.com");
  await dialog.getByLabel("Phone number").fill("+1 (415) 555-0123 ext. 42");
  await dialog
    .getByLabel("LinkedIn URL")
    .fill("https://www.linkedin.com/in/alex-rivera");
  await dialog.getByLabel("Company").fill("Acme");
  await dialog.getByRole("button", { name: "Save contact" }).click();
  await expect(page.getByText("Alex Rivera", { exact: true })).toBeVisible();
  await page.getByText("Alex Rivera", { exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("+1 (415) 555-0123 ext. 42", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: "https://www.linkedin.com/in/alex-rivera",
      exact: true,
    }),
  ).toHaveAttribute("href", "https://www.linkedin.com/in/alex-rivera");
  await page.getByRole("button", { name: "Log interaction" }).click();
  dialog = page.getByRole("dialog", { name: "Add interaction" });
  await expect(dialog.getByLabel("Date", { exact: true })).toHaveValue(today);
  await dialog.getByLabel("Interaction type / subject").fill("Networking call");
  await dialog
    .getByLabel("What happened?")
    .fill("Discussed the platform team and a referral.");
  await dialog.getByRole("button", { name: "Save interaction" }).click();
  await expect(
    page.getByText("Discussed the platform team and a referral."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  for (const term of ["555-0123", "linkedin.com/in/alex-rivera"]) {
    await page.getByLabel("Search all records").fill(term);
    await expect(page.getByText("Alex Rivera", { exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "Clear search" }).click();
  await page
    .getByRole("button", { name: "Opportunities", exact: true })
    .click();
  await page.getByRole("button", { name: "Add opportunity" }).first().click();
  dialog = page.getByRole("dialog", { name: "Add opportunity" });
  await expect(
    dialog.getByRole("combobox", { name: "Status", exact: true }),
  ).toHaveValue("submit");
  await dialog
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("lead");
  await dialog.getByLabel("Position title").fill("Senior Software Engineer");
  await dialog.getByLabel("Company *", { exact: true }).fill("Acme");
  await dialog.getByLabel("Source (e.g.").fill("Referral");
  await dialog
    .getByLabel("Source contact")
    .selectOption({ label: "Alex Rivera" });
  await dialog.getByRole("checkbox", { name: "Alex Rivera" }).check();
  await dialog
    .getByLabel("Notes", { exact: true })
    .fill("Ask about the platform team's priorities.");
  await dialog.getByRole("button", { name: "Save opportunity" }).click();
  const opportunities = page.getByRole("table");
  for (const column of [
    "Opportunity",
    "Status",
    "Last updated",
    "Next action",
    "Notes",
  ]) {
    await expect(
      opportunities.getByRole("columnheader", { name: column, exact: true }),
    ).toBeVisible();
  }
  await expect(opportunities.getByText("Lead", { exact: true })).toBeVisible();
  await expect(
    opportunities.getByText("No next action", { exact: true }),
  ).toBeVisible();
  await expect(
    opportunities.getByText("Ask about the platform team's priorities.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    opportunities.getByText("Not recorded", { exact: true }),
  ).toHaveCount(0);
  await page.getByText("Senior Software Engineer", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lead", exact: true }),
  ).toBeVisible();
  const leadRecords = await page.request
    .get("/api/entries")
    .then((r) => r.json());
  expect(leadRecords.find((r) => r.kind === "application").submittedDate).toBe(
    "",
  );
  expect(leadRecords.filter((r) => r.kind === "todo")).toHaveLength(0);
  await page.getByRole("button", { name: "Lead", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Edit application" });
  await dialog
    .getByRole("combobox", { name: "Stage", exact: true })
    .selectOption("submit");
  await dialog.getByLabel("Submission date").fill("2026-10-23");
  await dialog.getByRole("button", { name: "Save application" }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Record details" })
      .getByText("Follow Up", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(
    opportunities.getByText("Follow Up", { exact: true }),
  ).toBeVisible();
  await expect(
    opportunities.getByRole("button", { name: "First follow-up", exact: true }),
  ).toBeVisible();
  await expect(
    opportunities.getByRole("button", {
      name: "Second follow-up",
      exact: true,
    }),
  ).toHaveCount(0);
  await opportunities
    .getByRole("button", { name: "First follow-up", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog", { name: "Record details" })
      .getByRole("heading", { name: "First follow-up", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await page.getByRole("button", { name: "To-dos", exact: true }).click();
  await page.getByRole("button", { name: "Add to-do", exact: true }).click();
  const newTodo = page.getByRole("dialog", { name: "Add to-do" });
  await expect(newTodo.getByLabel("Due date")).toHaveValue(today);
  await newTodo.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByText("First follow-up", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Second follow-up", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Oct 26", { exact: true })).toBeVisible();
  await expect(page.getByText("Oct 29", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Complete First follow-up", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Opportunities", exact: true })
    .click();
  await expect(
    opportunities.getByRole("button", {
      name: "Second follow-up",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    opportunities.getByRole("button", { name: "First follow-up", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "/tmp/jobcrm-opportunities.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  const listRegion = page.getByRole("region", { name: "Opportunities list" });
  expect(
    await listRegion.evaluate(
      (element) => element.scrollWidth > element.clientWidth,
    ),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "To-dos", exact: true }).click();
  await page.getByRole("button", { name: "Edit to-do" }).first().click();
  dialog = page.getByRole("dialog", { name: "Edit to-do" });
  await expect(dialog.getByLabel("Due date")).toHaveValue("2026-10-29");
  await dialog.getByLabel("Due date").fill("2026-11-02");
  await dialog.getByRole("button", { name: "Save to-do" }).click();
  await expect(page.getByText("Nov 2", { exact: true })).toBeVisible();
  await page.getByLabel("Search all records").fill("Networking");
  await expect(
    page.getByText("Networking call", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  // Exercise a complete browser download and restore, including a second record added after backup.
  await page
    .getByRole("button", { name: "Backup & settings", exact: true })
    .click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download backup" }).click();
  const backup = await downloading;
  const backupPath = await backup.path();
  await page.getByRole("button", { name: "Contacts", exact: true }).click();
  await page.getByRole("button", { name: "Add contact" }).first().click();
  dialog = page.getByRole("dialog", { name: "Add contact" });
  await dialog.getByLabel("First name").fill("Temporary");
  await dialog.getByRole("button", { name: "Save contact" }).click();
  await expect(page.getByText("Temporary", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Backup & settings", exact: true })
    .click();
  await page.locator("input[type=file]").setInputFiles(backupPath);
  await page.getByRole("button", { name: "Replace and restore" }).click();
  await expect(page.getByText(/Restored 6 records/)).toBeVisible();
  await page.getByRole("button", { name: "Contacts", exact: true }).click();
  await expect(page.getByText("Alex Rivera", { exact: true })).toBeVisible();
  await expect(page.getByText("Temporary", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Opportunities", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add opportunity", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Add opportunity" });
  await expect(
    dialog.getByRole("combobox", { name: "Status", exact: true }),
  ).toHaveValue("submit");
  await dialog.getByLabel("Position title").fill("New submitted opportunity");
  await dialog.getByLabel("Company *", { exact: true }).fill("Example Company");
  await dialog.getByLabel("Source (e.g.").fill("Wellfound");
  await dialog.getByRole("button", { name: "Save opportunity" }).click();
  const submittedRow = page
    .getByRole("row")
    .filter({ hasText: "New submitted opportunity" });
  await expect(
    submittedRow.getByText("Follow Up", { exact: true }),
  ).toBeVisible();
  await expect(
    submittedRow.getByRole("button", { name: "First follow-up", exact: true }),
  ).toBeVisible();
  await submittedRow
    .getByRole("button", { name: "New submitted opportunity", exact: true })
    .click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Edit opportunity" });
  await expect(
    dialog.getByRole("combobox", { name: "Status", exact: true }),
  ).toHaveValue("follow-up");
  await dialog
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("interview");
  await dialog.getByRole("button", { name: "Save opportunity" }).click();
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(
    submittedRow.getByText("Interview", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({ path: "/tmp/jobcrm-dashboard.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Make room for what’s next." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await expect(page.locator(".sidebar")).not.toBeInViewport();
  await page.screenshot({
    path: "/tmp/jobcrm-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
});
