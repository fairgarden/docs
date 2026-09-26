import path from 'node:path';
import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

// The standalone demo route, derived from this file's location under `app`.
const route = path
  .dirname(import.meta.filename)
  .split('/app')
  .pop()!;

// Inline multi-file `code` with no `url`, highlighted on init. Nothing tells the
// server where the files live, yet every one of them must be highlighted in the
// initial HTML and stay highlighted once the page hydrates.
const fileNames = ['Checkbox.tsx', 'checkbox.module.css', 'useChecked.ts', 'index.ts'];
const highlighted = '[class*="pl-"]';

/** Collects uncaught errors and console errors from the page. */
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

/**
 * Scrolls a file into view and expects its code highlighted: frames outside the
 * viewport are only highlighted once they scroll into view.
 */
async function expectHighlightedInView(file: Locator) {
  await file.scrollIntoViewIfNeeded();
  await expect(file.locator(highlighted).first()).toBeVisible();
}

/** Selects a file tab, retrying until the page has hydrated and the tab responds. */
async function selectTab(page: Page, fileName: string) {
  const tab = page.getByTestId('tabs').getByRole('tab', { name: fileName });
  await expect(async () => {
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 1000 });
  }).toPass({ timeout: 15000 });
}

test('server-renders every file of inline code with no url highlighted', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(route);

  const files = page.getByTestId('files');
  await Promise.all(
    fileNames.map((fileName) =>
      expect(
        files.locator(`section[data-file="${fileName}"] ${highlighted}`).first(),
      ).toBeAttached(),
    ),
  );
  // The tabs render their selected file, the main one.
  await expect(page.getByTestId('tabs').locator(`pre ${highlighted}`).first()).toBeAttached();

  await context.close();
});

test('keeps every file of inline code with no url highlighted after hydration', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(route);

  // One file at a time: each step selects a tab or scrolls the page.
  /* eslint-disable no-await-in-loop */
  const tabsCode = page.getByTestId('tabs').locator('pre');
  for (const fileName of fileNames) {
    await selectTab(page, fileName);
    await expect(tabsCode.locator(highlighted).first()).toBeVisible();
  }

  const files = page.getByTestId('files');
  for (const fileName of fileNames) {
    await expectHighlightedInView(files.locator(`section[data-file="${fileName}"]`));
  }
  /* eslint-enable no-await-in-loop */

  expect(errors).toEqual([]);
});

test('switches every TypeScript file of inline code with no url to JavaScript', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await page.goto(route);
  // Wait for hydration with a click that is safe to repeat.
  await selectTab(page, 'index.ts');

  const files = page.getByTestId('files');
  await files.getByRole('button', { name: 'JS' }).click();

  const component = files.locator('section[data-file="Checkbox.jsx"]');
  const hook = files.locator('section[data-file="useChecked.js"]');
  await expect(component).toBeAttached({ timeout: 15000 });
  await expect(hook).toBeAttached();
  await expect(component).not.toContainText('interface CheckboxProps');
  await expect(hook).not.toContainText(': boolean');
  await expectHighlightedInView(component);
  await expectHighlightedInView(hook);

  expect(errors).toEqual([]);
});
