import path from 'node:path';
import { test, expect } from '@playwright/test';

// The standalone demo route, derived from this file's location under `app`.
const route = path
  .dirname(import.meta.filename)
  .split('/app')
  .pop()!;

// Both variants name their file `Counter.tsx`, and each production payload is
// compressed with its own file's text as the DEFLATE dictionary. Switching
// variants with the JS transform applied must decode the incoming variant with
// ITS dictionary, not the same-named file's from the initial variant.
const setups = [
  { name: 'demo-plain', description: 'without a ContentLoading' },
  { name: 'demo-init', description: "with highlightAfter: 'init' and no ContentLoading" },
  { name: 'demo-loading', description: 'with a ContentLoading' },
];

for (const { name, description } of setups) {
  test(`keeps the JS transform when switching between same-named variant files ${description}`, async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(`${route}/${name}`);
    const code = page.locator('pre').first();

    await expect(code).toContainText('interface CounterProps', { timeout: 15000 });

    await page.getByRole('button', { name: 'JS' }).click();
    await expect(page.getByText('Counter.jsx')).toBeVisible({ timeout: 15000 });
    await expect(code).not.toContainText('interface CounterProps');

    await page.getByText('InlineCount', { exact: true }).click();
    await page.getByRole('option', { name: 'OutputCount' }).click();

    // The incoming variant renders, still in JavaScript.
    await expect(code).toContainText('<output>', { timeout: 15000 });
    await expect(code).not.toContainText('interface CounterProps');
    await expect(page.getByText('Counter.jsx')).toBeVisible();

    expect(
      consoleErrors.filter((text) => /dictionary mismatch|Transform failed/i.test(text)),
    ).toEqual([]);
    expect(pageErrors, 'the demo should switch variants without uncaught errors').toEqual([]);
  });
}
