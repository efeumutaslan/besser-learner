import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should show login page", async ({ page }) => {
    await page.goto("/giris");
    await expect(page.getByRole("heading", { name: "BesserLernen" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Giris Yap" })).toBeVisible();
    await expect(page.getByPlaceholder("kullaniciadi")).toBeVisible();
    await expect(page.getByPlaceholder("******")).toBeVisible();
  });

  test("should show register page", async ({ page }) => {
    await page.goto("/kayit");
    await expect(page.getByRole("heading", { name: "Kayit Ol" })).toBeVisible();
    await expect(page.getByPlaceholder("en az 3 karakter")).toBeVisible();
    await expect(page.getByPlaceholder("en az 6 karakter")).toBeVisible();
  });

  test("should show error on invalid login", async ({ page }) => {
    await page.goto("/giris");
    await page.getByPlaceholder("kullaniciadi").fill("nonexistentuser");
    await page.getByPlaceholder("******").fill("wrongpassword");
    await page.getByRole("button", { name: /Giris Yap/i }).click();

    // Hata mesaji gorunmeli
    await expect(page.getByText(/hatali/i)).toBeVisible({ timeout: 5000 });
  });

  test("should navigate between login and register", async ({ page }) => {
    await page.goto("/giris");
    await page.getByRole("link", { name: /Kayit Ol/i }).click();
    await expect(page).toHaveURL(/\/kayit/);

    await page.getByRole("link", { name: /Giris Yap/i }).click();
    await expect(page).toHaveURL(/\/giris/);
  });

  test("should show password mismatch error on register", async ({ page }) => {
    await page.goto("/kayit");
    await page.getByPlaceholder("en az 3 karakter").fill("testuser");
    await page.getByPlaceholder("en az 6 karakter").fill("password123");
    await page.getByPlaceholder("sifreyi tekrar gir").fill("differentpass");
    await page.getByRole("button", { name: /Kayit Ol/i }).click();

    await expect(page.getByText(/eslesmiyor/i)).toBeVisible();
  });

  test("should toggle password visibility on login", async ({ page }) => {
    await page.goto("/giris");
    const pwInput = page.getByPlaceholder("******");

    // Varsayilan: password
    await expect(pwInput).toHaveAttribute("type", "password");

    // Goz ikonunu bul - sifre input'unun yanindaki button
    const pwContainer = page.locator("div.relative").filter({ has: pwInput });
    await pwContainer.locator("button").click();

    // Artik text olmali
    await expect(pwInput).toHaveAttribute("type", "text");
  });
});
