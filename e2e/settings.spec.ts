import { test, expect } from "@playwright/test";
import { loginOrRegister } from "./helpers";

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginOrRegister(page);
  });

  test("should show settings page title", async ({ page }) => {
    await page.goto("/ayarlar");
    await expect(page.getByRole("heading", { name: "Ayarlar" })).toBeVisible({ timeout: 10000 });
  });

  test("should have logout button", async ({ page }) => {
    await page.goto("/ayarlar");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Çıkış Yap")).toBeVisible({ timeout: 5000 });
  });

  test("should logout and redirect to login", async ({ page }) => {
    await page.goto("/ayarlar");
    await page.waitForLoadState("networkidle");

    await page.getByText("Çıkış Yap").click();

    // Giris sayfasina yonlendirilmeli
    await expect(page).toHaveURL(/\/giris/, { timeout: 10000 });
  });

  test("should show export and import options", async ({ page }) => {
    await page.goto("/ayarlar");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/Dışa Aktar|Disa Aktar|Export/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/İçe Aktar|Ice Aktar|Import/i).first()).toBeVisible({ timeout: 5000 });
  });
});
