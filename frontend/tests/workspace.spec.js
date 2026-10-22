import { test, expect } from "@playwright/test";

test("personal job search, relationships, follow-ups, search, backup and restore", async ({
  page,
}) => {
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
  await dialog.getByLabel("Company").fill("Acme");
  await dialog.getByRole("button", { name: "Save contact" }).click();
  await expect(page.getByText("Alex Rivera", { exact: true })).toBeVisible();
  await page.getByText("Alex Rivera", { exact: true }).click();
  await page.getByRole("button", { name: "Log interaction" }).click();
  dialog = page.getByRole("dialog", { name: "Add interaction" });
  await dialog.getByLabel("Interaction type / subject").fill("Networking call");
  await dialog
    .getByLabel("What happened?")
    .fill("Discussed the platform team and a referral.");
  await dialog.getByRole("button", { name: "Save interaction" }).click();
  await expect(
    page.getByText("Discussed the platform team and a referral."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await page
    .getByRole("button", { name: "Opportunities", exact: true })
    .click();
  await page.getByRole("button", { name: "Add opportunity" }).first().click();
  dialog = page.getByRole("dialog", { name: "Add opportunity" });
  await dialog.getByLabel("Position title").fill("Senior Software Engineer");
  await dialog.getByLabel("Company *", { exact: true }).fill("Acme");
  await dialog.getByLabel("Source (e.g.").fill("Referral");
  await dialog
    .getByLabel("Source contact")
    .selectOption({ label: "Alex Rivera" });
  await dialog.getByRole("checkbox", { name: "Alex Rivera" }).check();
  await dialog.getByRole("button", { name: "Save opportunity" }).click();
  await page.getByText("Senior Software Engineer", { exact: true }).click();
  await page.getByRole("button", { name: "Track application" }).click();
  dialog = page.getByRole("dialog", { name: "Add application" });
  await dialog
    .getByRole("combobox", { name: "Stage", exact: true })
    .selectOption("submit");
  await dialog.getByLabel("Submission date").fill("2026-10-23");
  await dialog.getByRole("button", { name: "Save application" }).click();
  await expect(page.getByRole("button", { name: "Follow Up" })).toBeVisible();
  await page.getByRole("button", { name: "Close details" }).click();
  await page.getByRole("button", { name: "To-dos", exact: true }).click();
  await expect(
    page.getByText("First follow-up", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Second follow-up", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Oct 26", { exact: true })).toBeVisible();
  await expect(page.getByText("Oct 29", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit to-do" }).first().click();
  dialog = page.getByRole("dialog", { name: "Edit to-do" });
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
