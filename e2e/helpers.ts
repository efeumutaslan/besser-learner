import { Page, expect } from "@playwright/test";

// Test kullanicisi bilgileri
export const TEST_USER = {
  username: "e2etest",
  password: "test123456",
  displayName: "E2E Tester",
};

/**
 * Kayit ol veya giris yap.
 * Eger kullanici yoksa kayit oluyor, varsa giris yapiyor.
 */
export async function loginOrRegister(page: Page) {
  // Kayit sayfasina git, kayit olmaya calis
  await page.goto("/kayit");
  await page.waitForLoadState("networkidle");

  // Zaten giris yapilmissa ana sayfaya yonlendirilmis olabilir
  if (!page.url().includes("/kayit") && !page.url().includes("/giris")) {
    return; // Zaten giris yapilmis
  }

  // Kayit sayfasindaysak kayit olmaya calis
  if (page.url().includes("/kayit")) {
    await page.getByPlaceholder("en az 3 karakter").fill(TEST_USER.username);
    await page.getByPlaceholder("opsiyonel").fill(TEST_USER.displayName);
    await page.getByPlaceholder("en az 6 karakter").fill(TEST_USER.password);
    await page.getByPlaceholder("sifreyi tekrar gir").fill(TEST_USER.password);
    await page.getByRole("button", { name: /Kayit Ol/i }).click();

    await page.waitForTimeout(2000);

    if (page.url().includes("/kayit")) {
      // Kullanici zaten kayitli — girise gec
      await page.goto("/giris");
      await doLogin(page);
    }
    return;
  }

  // Giris sayfasindaysak direkt giris yap
  await doLogin(page);
}

async function doLogin(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.getByPlaceholder("kullaniciadi").fill(TEST_USER.username);
  await page.getByPlaceholder("******").fill(TEST_USER.password);
  await page.getByRole("button", { name: /Giris Yap/i }).click();
  await page.waitForTimeout(2000);
}

/**
 * Ana sayfada oldugumuzu dogrula
 */
export async function expectHomePage(page: Page) {
  await expect(page.getByRole("heading", { name: "BesserLernen" })).toBeVisible({ timeout: 10000 });
}

/**
 * Yeni deste olustur
 */
export async function createDeck(page: Page, name: string): Promise<void> {
  // "Yeni Deste Oluştur" butonuna tikla (NewDeckCard)
  await page.getByRole("button", { name: /Yeni Deste Oluştur/i }).click();

  // Modal acilir — placeholder'a yaz
  const nameInput = page.getByPlaceholder(/A1 Kelimeler/i);
  await expect(nameInput).toBeVisible({ timeout: 5000 });
  await nameInput.fill(name);

  // Deste Oluştur submit butonuna bas (exact match — "Yeni Deste Oluştur" ile karismasin)
  await page.getByRole("button", { name: "Deste Oluştur", exact: true }).click();

  // Modal kapanana kadar bekle
  await page.waitForLoadState("networkidle");
}
