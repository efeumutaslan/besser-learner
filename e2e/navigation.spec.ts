import { test, expect } from "@playwright/test";
import { loginOrRegister, expectHomePage } from "./helpers";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginOrRegister(page);
  });

  test("should navigate to Calis page", async ({ page }) => {
    await page.goto("/");
    await expectHomePage(page);

    await page.locator("nav").getByText("Çalış").click();
    await expect(page).toHaveURL(/\/calisma/);
  });

  test("should navigate to Market page", async ({ page }) => {
    await page.goto("/");
    await expectHomePage(page);

    await page.locator("nav").getByText("Market").click();
    await expect(page).toHaveURL(/\/market/);
  });

  test("should navigate to Istatistik page", async ({ page }) => {
    await page.goto("/");
    await expectHomePage(page);

    await page.locator("nav").getByText("İstatistik").click();
    await expect(page).toHaveURL(/\/istatistik/);
  });

  test("should navigate to Ayarlar page", async ({ page }) => {
    await page.goto("/");
    await expectHomePage(page);

    await page.locator("nav").getByText("Ayarlar").click();
    await expect(page).toHaveURL(/\/ayarlar/);
  });

  test("should redirect unauthenticated user to login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/");

    // Login sayfasina yonlendirilmeli
    await expect(page).toHaveURL(/\/giris/, { timeout: 10000 });
  });
});
