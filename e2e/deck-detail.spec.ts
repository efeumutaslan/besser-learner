import { test, expect } from "@playwright/test";
import { loginOrRegister, expectHomePage, createDeck } from "./helpers";

test.describe("Deck Detail", () => {
  test.beforeEach(async ({ page }) => {
    await loginOrRegister(page);
  });

  test("should show deck detail with card list", async ({ page }) => {
    await page.goto("/");
    await expectHomePage(page);

    const deckName = `Detail Test ${Date.now()}`;
    await createDeck(page, deckName);

    // Yeni desteye tikla
    await page.getByText(deckName).click();
    await expect(page).toHaveURL(/\/desteler\//, { timeout: 5000 });

    // Deste adi gorunmeli
    await expect(page.getByText(deckName)).toBeVisible();
  });

  test("should show study mode buttons in deck", async ({ page }) => {
    await page.goto("/");
    await expectHomePage(page);

    const deckLink = page.locator("a[href^='/desteler/']").first();
    if (await deckLink.isVisible().catch(() => false)) {
      await deckLink.click();
      await expect(page).toHaveURL(/\/desteler\//);

      // Calisma modu butonlari
      const modes = page.getByText(/Çalış|Öğren|Test|Eşleştir|Blast/i);
      await expect(modes.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("should go back to home from deck detail", async ({ page }) => {
    await page.goto("/");
    await expectHomePage(page);

    const deckLink = page.locator("a[href^='/desteler/']").first();
    if (await deckLink.isVisible().catch(() => false)) {
      await deckLink.click();
      await expect(page).toHaveURL(/\/desteler\//);

      // Geri butonu veya BottomNav ile geri don
      await page.locator("nav").getByText("Desteler").click();
      await expect(page).toHaveURL("/");
    }
  });
});
