import { test, expect } from "@playwright/test";
import { resetBrowserDatabase } from "./reset";
test.beforeEach(resetBrowserDatabase);
test("holdings, manual prices, deposit redemption, transfers, budgets and preferences", async ({
  page,
}) => {
  await page.goto("/accounts");
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Account name").fill("Wealth bank");
  await dialog.getByLabel("Opening balance").fill("1000");
  await dialog.getByRole("button", { name: "Save account" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Add account", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Account name").fill("Wealth cash");
  await dialog.getByLabel("Account type").selectOption("Cash");
  await dialog.getByRole("button", { name: "Save account" }).click();
  await expect(dialog).toBeHidden();
  await page.goto("/transactions");
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Amount", { exact: true }).fill("100");
  await dialog.getByLabel("Transaction type").selectOption("Transfer");
  await dialog
    .getByLabel("Description", { exact: true })
    .fill("Wealth transfer");
  await dialog
    .getByLabel("From account")
    .selectOption({ label: "Wealth bank" });
  await dialog.getByLabel("To account").selectOption({ label: "Wealth cash" });
  await dialog.getByRole("button", { name: "Save transaction" }).click();
  await expect(dialog).toBeHidden();
  await page.goto("/investments");
  await page.getByRole("button", { name: "Add holding", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Ticker", { exact: true }).fill("TEST");
  await dialog.getByLabel("Company name").fill("Test holding");
  await dialog.getByLabel("Number of shares").fill("2");
  await dialog.getByLabel("Average purchase price").fill("100");
  await dialog.getByLabel("Current price").fill("120");
  await dialog.getByRole("button", { name: "Save stock" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByText("₹240.00", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit / price", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Current price").fill("125");
  await dialog.getByRole("button", { name: "Save stock" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByText("₹250.00", { exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add fixed deposit", exact: true })
    .first()
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Bank name").fill("Test FD bank");
  await dialog.getByLabel("Principal", { exact: true }).fill("500");
  await dialog.getByLabel("Annual interest rate").fill("7");
  const maturity = new Date();
  maturity.setFullYear(maturity.getFullYear() + 1);
  await dialog
    .getByLabel("Maturity date")
    .fill(maturity.toISOString().slice(0, 10));
  await dialog.getByRole("button", { name: "Save deposit" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Test FD bank" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit deposit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("Redeemed");
  await dialog.getByRole("button", { name: "Save deposit" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Redeemed", { exact: true })).toBeVisible();
  await page.goto("/categories");
  const row = page.getByRole("row").filter({ hasText: "Groceries" });
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Monthly budget").fill("5000");
  await dialog.getByRole("button", { name: "Save category" }).click();
  await expect(dialog).toBeHidden();
  await expect(row.getByText("₹5,000.00", { exact: true })).toBeVisible();
  await page.goto("/settings");
  await page.getByRole("button", { name: "Edit preferences" }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByLabel("Overview reporting period").selectOption("year");
  await dialog.getByLabel("Default payment method").selectOption("Cash");
  await dialog.getByRole("button", { name: "Save preferences" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Current year", { exact: true })).toBeVisible();
});
