import { test, expect } from '@playwright/test';

// Requires REQUIRE_2FA=false on the backend under test — the seeded users have no
// TOTP secret enrolled, so enforcing 2FA here would block every run on a QR-code
// scan a script can't perform. 2FA *enforcement* itself is a backend concern and
// already covered by VerifyTwoFactor's PHPUnit feature tests; this suite verifies
// the things only a real browser can: that the login page renders, submits, and
// the app actually routes an authenticated super_admin into the dashboard.
test('logs in and lands on the dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.locator('#email').fill('e2e-admin@jvd.local');
  await page.locator('#password').fill('E2eTest!2026');
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
});

test('rejects a bad password with an error, not a silent redirect', async ({ page }) => {
  await page.goto('/login');

  await page.locator('#email').fill('e2e-admin@jvd.local');
  await page.locator('#password').fill('definitely-wrong-password');
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText(/invalid|incorrect|credentials/i)).toBeVisible({ timeout: 10000 });
});
