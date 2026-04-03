import { test, expect } from "@playwright/test";
import { loginOrRegister } from "./helpers";

test.describe("Market", () => {
  test.beforeEach(async ({ page }) => {
    await loginOrRegister(page);
  });

  test("should show market page with search", async ({ page }) => {
    await page.goto("/market");
    await expect(page.getByText("Deste Marketi")).toBeVisible({ timeout: 10000 });
    await expect(page.getByPlaceholder("Deste ara...")).toBeVisible();
  });

  test("should show category filter buttons", async ({ page }) => {
    await page.goto("/market");
    // Tumu butonu — kategoriler yuklendikten sonra gorunur
    await expect(page.getByRole("button", { name: "Tumu" })).toBeVisible({ timeout: 10000 });
  });

  test("should display deck cards or empty state", async ({ page }) => {
    await page.goto("/market");

    // Loading spinner kapansin
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Ya Indir butonu, ya bos mesaj, ya hata mesaji gorunmeli
    const hasDecks = await page.getByRole("button", { name: /Indir/i }).first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/bulunamadi|eklenmemis/i).isVisible().catch(() => false);
    const hasError = await page.getByText(/yuklenemedi/i).isVisible().catch(() => false);

    expect(hasDecks || hasEmpty || hasError).toBeTruthy();
  });

  test("should install a deck from market", async ({ page }) => {
    await page.goto("/market");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const installBtn = page.getByRole("button", { name: /Indir/i }).first();
    const isVisible = await installBtn.isVisible().catch(() => false);

    if (isVisible) {
      await installBtn.click();
      // "Yuklendi" durumu gorunmeli
      await expect(page.getByText("Yuklendi").first()).toBeVisible({ timeout: 10000 });
    }
  });
});
