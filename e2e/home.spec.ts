import { test, expect } from "@playwright/test";
import { loginOrRegister, expectHomePage, createDeck } from "./helpers";

test.describe("Home Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginOrRegister(page);
  });

  test("should show home page after login", async ({ page }) => {
    await page.goto("/");
    await expectHomePage(page);
  });

  test("should show bottom navigation", async ({ page }) => {
    await page.goto("/");
    await expectHomePage(page);

    // BottomNav linkleri (nav icinde scope'la — duplicate olmaz)
    await expect(page.locator("nav").getByText("Desteler")).toBeVisible();
    await expect(page.locator("nav").getByText("Çalış")).toBeVisible();
    await expect(page.locator("nav").getByText("Market")).toBeVisible();
    await expect(page.locator("nav").getByText("İstatistik")).toBeVisible();
    await expect(page.locator("nav").getByText("Ayarlar")).toBeVisible();
  });

  test("should show XP and streak stats", async ({ page }) => {
    await page.goto("/");
    await expectHomePage(page);

    await expect(page.getByText(/XP/)).toBeVisible();
  });

  test("should open new deck modal", async ({ page }) => {
    await page.goto("/");
    await expectHomePage(page);

    // NewDeckCard butonuna tikla
    await page.getByRole("button", { name: /Yeni Deste Oluştur/i }).click();

    // Modal icindeki input gorunmeli
    await expect(page.getByPlaceholder(/A1 Kelimeler/i)).toBeVisible({ timeout: 5000 });
  });

  test("should create a new deck", async ({ page }) => {
    await page.goto("/");
    await expectHomePage(page);

    const deckName = `Test Deste ${Date.now()}`;
    await createDeck(page, deckName);

    // Deste listede gorunmeli
    await expect(page.getByText(deckName)).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to deck detail", async ({ page }) => {
    await page.goto("/");
    await expectHomePage(page);

    const deckLinks = page.locator("a[href^='/desteler/']");
    const count = await deckLinks.count();

    if (count > 0) {
      await deckLinks.first().click();
      await expect(page).toHaveURL(/\/desteler\//);
    }
  });
});
