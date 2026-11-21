import { expect, test } from '@playwright/test';

const context = 'sport=NBA&tz=America%2FPhoenix&date=2026-11-21&mode=demo';
const conventionalTicket = [
  'FanDuel', 'NBA',
  'LeBron James - Over 28.5 Points -110',
  'Jalen Brunson - Over 5.5 Assists -120'
].join('\n');

async function reviewPastedTicket(page: any, text: string) {
  await page.getByRole('button', { name: 'Paste ticket' }).click();
  await page.getByPlaceholder('Paste each leg on a new line').fill(text);
  await page.getByRole('button', { name: 'Review extracted ticket' }).click();
  return page.getByRole('checkbox', { name: /confirm leg \d/i });
}

test('landing reaches the canonical stress test, build and control views', async ({ page }: { page: any }) => {
  await page.goto('/?' + context);
  await page.screenshot({ path: 'docs/journey-landing.png', fullPage: true });

  await page.getByRole('link', { name: /open stress test/i }).click();
  await expect(page).toHaveURL(/\/stress-test\?/);
  await expect(page).toHaveURL(/tz=America%2FPhoenix/);
  await expect(page).toHaveURL(/date=2026-11-21/);
  await expect(page.getByRole('heading', { name: /give me a ticket/i })).toBeVisible();
  await page.screenshot({ path: 'docs/journey-stress-scout.png', fullPage: true });

  await page.goto('/slip?' + context);
  await expect(page.getByRole('heading', { name: /build one ticket/i })).toBeVisible();
  await page.screenshot({ path: 'docs/journey-slip.png', fullPage: true });

  await page.goto('/control?tab=live&' + context);
  await expect(page.getByRole('heading', { name: 'Control Room: Live' })).toBeVisible();
  await page.screenshot({ path: 'docs/journey-control.png', fullPage: true });
});

test('mobile intake requires review and opens the same draft in Full Ticket X-Ray', async ({ page }: { page: any }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?' + context);
  await page.getByRole('link', { name: 'Scan ticket' }).click();
  await expect(page).toHaveURL(/\/ingest\?/);
  await expect(page.getByRole('heading', { name: 'Upload Your Parlay' })).toBeVisible();

  const confirmations = await reviewPastedTicket(page, conventionalTicket);
  await expect(confirmations).toHaveCount(2);
  for (const field of await confirmations.all()) {
    await expect(field).not.toBeChecked();
    await field.check();
  }
  await page.getByRole('button', { name: 'Analyze My Ticket' }).click();

  await expect(page).toHaveURL(/\/stress-test\?/);
  const url = new URL(page.url());
  for (const key of ['slip_id', 'trace_id']) expect(url.searchParams.get(key)).toBeTruthy();
  expect(url.searchParams.get('sport')).toBe('NBA');
  expect(url.searchParams.get('tz')).toBe('America/Phoenix');
  await expect(page.getByRole('heading', { name: 'Full Ticket X-Ray' })).toBeVisible();
  await expect(page.getByText(/primary pressure/i).first()).toBeVisible();
  await expect(page.getByText(/suggested next action/i).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Full Ticket X-Ray' })).toBeVisible();
  await page.screenshot({ path: 'docs/journey-research.png', fullPage: true });
});

test('special pricing keeps reviewed selections available at a narrow viewport', async ({ page }: { page: any }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/ingest?entry=bender&' + context);
  const text = [
    'PrizePicks lineup', 'NBA',
    'Franz Wagner', 'ORL - F - #22', 'More 14.5 Rebounds + Assists',
    'Daniss Jenkins', 'DET - G - #24', 'More 26.5 PRA'
  ].join('\n');
  const confirmations = await reviewPastedTicket(page, text);
  await expect(confirmations).toHaveCount(2);
  for (const field of await confirmations.all()) await field.check();
  await page.getByRole('button', { name: 'Analyze My Ticket' }).click();
  await expect(page.getByRole('heading', { name: 'Research-Only X-Ray' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Inspect Each Leg' })).toBeVisible();
  const leg = page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'Franz Wagner' }) });
  await leg.locator('summary').click();
  await expect(leg.getByText('Franz Wagner', { exact: true })).toBeVisible();
  await expect(page.getByText(/combined probability, payout estimates and expected value are unavailable/i)).toBeVisible();
});

test('a Kalshi capture with missing selections opens Partial Research', async ({ page }: { page: any }) => {
  await page.goto('/ingest?entry=bender&' + context);
  const text = [
    'Kalshi', '10 MARKET COMBO', 'NCAA Football',
    'The Citadel at Western Carolina', 'Western Carolina to win 83%',
    'Cal Poly at UC Davis', 'UC Davis to win 81%'
  ].join('\n');
  const confirmations = await reviewPastedTicket(page, text);
  await expect(confirmations).toHaveCount(2);
  await confirmations.first().check();
  await page.getByRole('button', { name: 'Open Partial Research' }).click();
  await expect(page.getByRole('heading', { name: 'Incomplete Ticket Review' })).toBeVisible();
  await expect(page.getByText('2 of 10 selections recognized. 1 confirmed.', { exact: true })).toBeVisible();
  await expect(page.getByText('2 of 10 selections recognized. 8 selections still need review.', { exact: true })).toBeVisible();
  await expect(page.getByText(/Partial Research · confirmed selections only/i)).toBeVisible();
  await expect(page.locator('summary').filter({ hasText: 'Western Carolina' })).toBeVisible();
  await expect(page.locator('summary').filter({ hasText: 'UC Davis' })).toHaveCount(0);
});
