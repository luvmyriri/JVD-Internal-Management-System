import { test, expect } from '@playwright/test';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.locator('#email').fill('e2e-admin@jvd.local');
  await page.locator('#password').fill('E2eTest!2026');
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}

// Proves the full chain works through a real browser: auth token attached by the
// Axios client, RBAC route guard, and the actual invoices API — not just that each
// layer passes its own unit tests in isolation.
test('super_admin can open Billing and see the invoices list load', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/accounting/billing');
  await expect(page).toHaveURL(/\/accounting\/billing/);

  // Either real invoice rows or an explicit empty state — anything else (a stuck
  // spinner, a thrown error boundary) means the chain is broken somewhere.
  const rowsOrEmptyState = page
    .locator('table tbody tr')
    .or(page.getByTestId('empty-state'))
    .or(page.getByText(/no invoices/i));
  await expect(rowsOrEmptyState.first()).toBeVisible({ timeout: 15000 });
});
