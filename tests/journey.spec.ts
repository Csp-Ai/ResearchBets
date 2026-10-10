import { expect, test } from '@playwright/test';

// The beta's required journey is ticket-first, not a legacy dashboard tour.
// APIs are stubbed so the browser test evaluates the actual interaction path
// without provider credentials or silently substituting a fake live feed.
test('first-time mobile bettor reviews a pasted ticket before Ticket X-Ray', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/slips/parseText', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: {
        ticketId: 'ticket-mobile', createdAt: '2026-10-10T12:00:00.000Z',
        sourceHint: 'paste', rawSlipText: 'Justin Jefferson 60+ receiving yards -300 MIN @ GB',
        legs: [{
          legId: 'leg-1', league: 'NFL', player: 'Justin Jefferson',
          marketType: 'receiving_yards', marketLabel: 'Receiving yards',
          threshold: 60, direction: 'over', odds: '-300', source: 'paste',
          parseConfidence: 'high', ladder: true, teams: 'MIN @ GB',
        }],
      } }),
    });
  });
  await page.route('**/api/slips/submit', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, trace_id: 'mobile-trace', data: {
        slip_id: '00000000-0000-0000-0000-000000000001',
        trace_id: 'mobile-trace', anon_id: 'mobile-anon',
        spine: { trace_id: 'mobile-trace', mode: 'demo', sport: 'NFL' },
        trace: { trace_id: 'mobile-trace', mode: 'demo' },
        parse: { confidence: 0.8, legs_count: 1, needs_review: false },
      } }),
    });
  });

  await page.goto('/ingest?sport=NFL&mode=demo');
  await expect(page.getByRole('heading', { name: 'Scan my bet slip' })).toBeVisible();
  await page.getByLabel('Ticket selections').fill('Justin Jefferson 60+ receiving yards -300 MIN @ GB');
  await page.getByRole('button', { name: 'Review selections' }).click();
  await expect(page.getByTestId('parsed-slip-review')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirm and see X-Ray' })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Confirm and see X-Ray' }).click();

  await expect(page).toHaveURL(/\/stress-test/);
  await expect(page.getByTestId('xray-briefing')).toBeVisible();
  await expect(page.getByText(/Structural risk, not a win-probability claim/)).toBeVisible();
});

test('unreadable OCR needs field correction before X-Ray', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/api/slips/parseText', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: {
        ticketId: 'unreadable', createdAt: '2026-10-10T12:00:00.000Z',
        sourceHint: 'screenshot', rawSlipText: 'OVER 5.5 ASSISTS',
        legs: [{
          legId: 'leg-1', league: 'NBA', player: 'Needs review',
          marketType: 'assists', marketLabel: 'Assists', threshold: 5.5,
          direction: 'over', source: 'screenshot', parseConfidence: 'low', needsReview: true,
        }],
      } }),
    });
  });

  await page.goto('/ingest?sport=NBA&mode=demo');
  await page.getByLabel('Ticket selections').fill('OVER 5.5 ASSISTS');
  await page.getByRole('button', { name: 'Review selections' }).click();
  await expect(page.getByText(/Enter the full player name/)).toBeVisible();
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('button', { name: 'Confirm and see X-Ray' })).toBeDisabled();
});
