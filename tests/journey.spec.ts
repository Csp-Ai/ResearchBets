import { expect, test } from '@playwright/test';

test('golden path: landing to ingest to research', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /analyze/i }).first().click();
  await expect(page).toHaveURL(/\/ingest/);
  await expect(page.getByRole('heading', { name: /paste slip/i })).toBeVisible();

  await page.getByRole('button', { name: /analyze now/i }).click();
  await expect(page).toHaveURL(/\/research\?trace=/, { timeout: 15000 });
  await expect(page.getByText(/mode:/i).first()).toBeVisible();
});

test('landing scout path renders scout surface', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /open full scout/i }).click();
  await expect(page).toHaveURL(/\/stress-test\?tab=scout/);
  await expect(page.getByText(/scout/i).first()).toBeVisible();
});
