import { expect, test } from '@playwright/test';

test('journey 1: Landing → Board Analyze → Stress Test Scout → Build Slip → Control Room', async ({ page }) => {
  await page.goto('/?sport=NBA&tz=America/Phoenix&mode=live');
  await page.screenshot({ path: 'docs/journey-landing.png', fullPage: true });

  await page.getByRole('link', { name: /open full scout/i }).click();
  await expect(page).toHaveURL(/\/stress-test/);
  await expect(page.getByText(/active players/i)).toBeVisible();
  await page.screenshot({ path: 'docs/journey-stress-scout.png', fullPage: true });

  await page.goto('/slip?sport=NBA&tz=America/Phoenix&mode=live');
  await expect(page.getByText(/build/i).first()).toBeVisible();
  await page.screenshot({ path: 'docs/journey-slip.png', fullPage: true });

  await page.goto('/control?tab=live&sport=NBA&tz=America/Phoenix&mode=live');
  await expect(page.getByText(/control room/i).first()).toBeVisible();
  await page.screenshot({ path: 'docs/journey-control.png', fullPage: true });
});

test('journey 2: Landing → Analyze my slip → Ingest paste → Research', async ({ page }) => {
  await page.goto('/?sport=NBA&tz=America/Phoenix&mode=live');
  await page.getByRole('link', { name: /analyze/i }).first().click();
  await expect(page).toHaveURL(/\/ingest/);
  await expect(page.getByRole('heading', { name: /paste slip/i })).toBeVisible();

  await page.getByRole('button', { name: /analyze now/i }).click();
  await expect(page).toHaveURL(/\/research\?trace=/, { timeout: 15000 });
  await expect(page.getByText(/mode:/i).first()).toBeVisible();
  await page.screenshot({ path: 'docs/journey-research.png', fullPage: true });
});
