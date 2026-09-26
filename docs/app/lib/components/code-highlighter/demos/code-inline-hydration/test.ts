import path from 'node:path';
import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

// The standalone demo route, derived from this file's location under `app`.
const route = path
  .dirname(import.meta.filename)
  .split('/app')
  .pop()!;

// Inline code with no `url` and the default `highlightAfter`, under
// `CodeProviderLazy`. Hydration waits for a code-split part of the content and then
// renders the code again, by which time the browser has loaded the lazy emphasis
// enhancer, while a freshly started server hasn't loaded it yet. The server runs the
// emphasis enhancer on every inline file, so the HTML already has its frames and
// hydration never depends on which side has loaded the enhancer.
//
// Run against a freshly started `next dev` (Playwright reuses a running server), the
// first request here is the one that logged a hydration mismatch before that.
const blocks = ['single', 'files'];
const highlighted = '[class*="pl-"]';

/** Collects uncaught errors and console errors, hydration warnings included. */
function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    // The static export serves no Vercel analytics scripts.
    if (message.type() === 'error' && !message.location().url.includes('/_vercel/')) {
      errors.push(message.text());
    }
  });
  return errors;
}

/** The `data-frame-type` of every frame of the block's rendered code. */
function getFrameTypes(block: Locator) {
  return block
    .locator('pre .frame')
    .evaluateAll((frames) => frames.map((frame) => frame.getAttribute('data-frame-type')));
}

/** Selects a file tab, retrying until the page has hydrated and the tab responds. */
async function selectTab(block: Locator, fileName: string) {
  const tab = block.getByRole('tab', { name: fileName });
  await expect(async () => {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 1000 });
  }).toPass({ timeout: 15000 });
}

test('hydrates inline code without errors and keeps its emphasis frames', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(route);

  /* eslint-disable no-await-in-loop */
  for (const block of blocks) {
    // Highlighted once the page has hydrated and the idle highlight has run.
    await expect(page.getByTestId(block).locator(highlighted).first()).toBeVisible({
      timeout: 15000,
    });
    expect(await getFrameTypes(page.getByTestId(block))).toEqual(['focus']);
  }
  /* eslint-enable no-await-in-loop */

  // The extra file, which the server enhanced too.
  const files = page.getByTestId('files');
  await selectTab(files, 'useChecked.ts');
  await expect(files.locator(`pre ${highlighted}`).first()).toBeVisible();
  expect(await getFrameTypes(files)).toEqual(['focus']);

  expect(errors).toEqual([]);
});

test('server-renders inline code with its emphasis frames', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(route);

  for (const block of blocks) {
    // eslint-disable-next-line no-await-in-loop
    expect(await getFrameTypes(page.getByTestId(block))).toEqual(['focus']);
  }

  await context.close();
});
