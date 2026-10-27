import { test, expect } from "@playwright/test";
import { resetBrowserDatabase } from "./reset";
test.beforeEach(resetBrowserDatabase);
test("accounts, expense editing, duplicate preview, filters, CSV, and settlements", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Set up your finances" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/first-run.png", fullPage: true });
  await page.getByRole("button", { name: "Create your first account" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Account name").fill("Browser bank");
  await dialog.getByLabel("Opening balance").fill("1000");
  await dialog.getByRole("button", { name: "Save account" }).click();
  await expect(dialog).toBeHidden();
  await page.goto("/transactions");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount", { exact: true }).fill("125.50");
  await dialog.getByLabel("Description", { exact: true }).fill("Browser lunch");
  await dialog
    .getByLabel("From account")
    .selectOption({ label: "Browser bank" });
  await dialog
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption({ label: "Food, Dining & Cafes" });
  await dialog.getByRole("button", { name: "Save transaction" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Browser lunch", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount", { exact: true }).fill("150");
  await dialog.getByRole("button", { name: "Save transaction" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("−₹150.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Amount", { exact: true })).toHaveValue(
    "150.00",
  );
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Search", { exact: true }).fill("Not present");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(page.getByText("0 matching transactions")).toBeVisible();
  await page.getByRole("link", { name: "Clear", exact: true }).click();
  const csv = await page.request.get("/api/export?q=Browser");
  expect(csv.status()).toBe(200);
  expect(await csv.text()).toContain("Browser lunch");
  const missing = await page.request.get("/api/export?q=NotPresent");
  expect(await missing.text()).not.toContain("Browser lunch");
  await page.goto("/splits");
  await page.getByRole("button", { name: "Record split", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Friend name").fill("Browser friend");
  await dialog.getByLabel("Purpose", { exact: true }).fill("Lunch share");
  await dialog.getByLabel("Total expense", { exact: true }).fill("150");
  await dialog.getByLabel("Amount owed to you").fill("75");
  await dialog.getByLabel("Paid from").selectOption({ label: "Browser bank" });
  await dialog.getByRole("button", { name: "Save split", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.locator("summary").click();
  await page
    .getByRole("button", { name: "Record repayment", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Repayment amount").fill("25");
  await dialog
    .getByRole("button", { name: "Save settlement", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("₹50.00 outstanding · all dates")).toBeVisible();
  await page.getByRole("button", { name: "Settle all", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("button", { name: "Save settlements", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("All settled", { exact: true })).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByText("₹850.00", { exact: true }).first(),
  ).toBeVisible();
  await page.goto("/monthly-recap");
  await expect(
    page.getByText("₹150.00", { exact: true }).first(),
  ).toBeVisible();
  for (const route of [
    "/accounts",
    "/categories",
    "/investments",
    "/settings",
  ]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.getByText("We couldn’t load your finances")).toHaveCount(
      0,
    );
  }
});
test("mobile layouts, themes, and navigation remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings");
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  for (const route of [
    "/",
    "/transactions",
    "/monthly-recap",
    "/investments",
    "/splits",
    "/accounts",
    "/categories",
    "/settings",
  ]) {
    await page.goto(route);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/mobile-settings.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await page.screenshot({
    path: "test-results/desktop-overview.png",
    fullPage: true,
  });
});
