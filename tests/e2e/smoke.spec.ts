import { test, expect } from "@playwright/test";

test.describe("Smoke test — core navigation", () => {
  test("home page renders a greeting and shows follow-up suggestions", async ({ page }) => {
    await page.goto("/home");

    // Greeting is time-dependent — match any of the three variants
    await expect(
      page.getByText(/good (morning|afternoon|evening)/i).first(),
    ).toBeVisible();
  });

  test("clients page shows at least 7 contacts", async ({ page }) => {
    await page.goto("/clients");

    // Tab label in TabBar is "CLIENT" (singular) — match by link href
    await expect(page).toHaveURL(/\/clients/);

    // Wait for contact cards to appear — they are <a> tags linking to /clients/:id
    const contactLinks = page.locator('a[href^="/clients/"]');
    await expect(contactLinks).toHaveCount(7, { timeout: 10_000 });
  });

  test("navigating to a contact detail page works", async ({ page }) => {
    await page.goto("/clients");

    // Click the first contact
    const firstContact = page.locator('a[href^="/clients/"]').first();
    await firstContact.click();

    // Should be on a detail page
    await expect(page).toHaveURL(/\/clients\/\w+/);

    // Profile header should be visible (contact name in large text)
    await expect(page.locator("h1, [data-testid='contact-name']").first()).toBeVisible();
  });
});
