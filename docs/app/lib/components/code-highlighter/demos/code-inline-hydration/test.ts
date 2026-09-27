import path from 'node:path';
import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

// The standalone demo route, derived from this file's location under `app`.
const route = path
  .dirname(import.meta.filename)
  .split('/app')
  .pop()!;

// Inline code with no `url` and the default `highlightAfter`, under a default
// `CodeProviderLazy`. Hydration waits for a code-split part of the content and then
// renders the code again, by which time the browser has loaded the lazy emphasis
// enhancer, while a freshly started server hasn't loaded it yet. `useCode` holds the
// provider's lazy enhancer back until hydration is over, so hydration never depends
// on which side has loaded it. The block that passes the emphasis enhancer to the
// server has its frames in the HTML already.
//
// Run against a freshly started `next dev` (Playwright reuses a running server), the
// first request here is the one that logged a hydration mismatch before that.
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

/** Waits until React has hydrated the block: its content sets `data-hydrated` in an effect. */
async function waitForHydration(block: Locator) {
  await expect(block.locator('[data-hydrated]')).toBeAttached({ timeout: 15000 });
}

/** Selects a file tab. */
async function selectTab(block: Locator, fileName: string) {
  const tab = block.getByRole('tab', { name: fileName });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
}

test('hydrates inline code without errors and applies its emphasis frames', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto(route);

  // Left to the provider: its lazy emphasis enhancer runs right after hydration.
  const single = page.getByTestId('single');
  await waitForHydration(single);
  await expect.poll(() => getFrameTypes(single), { timeout: 15000 }).toEqual(['focus']);

  // Enhanced on the server: the frames are there from the first paint, and stay.
  const files = page.getByTestId('files');
  await waitForHydration(files);
  expect(await getFrameTypes(files)).toEqual(['focus']);

  // The extra file, which the server enhanced too.
  await selectTab(files, 'useChecked.ts');
  await expect(files.locator(`pre ${highlighted}`).first()).toBeVisible({ timeout: 15000 });
  expect(await getFrameTypes(files)).toEqual(['focus']);

  expect(errors).toEqual([]);
});

test('server-renders the emphasis frames only for code that passes the enhancer to the server', async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(route);

  expect(await getFrameTypes(page.getByTestId('single'))).toEqual([null]);
  expect(await getFrameTypes(page.getByTestId('files'))).toEqual(['focus']);

  await context.close();
});
