import path from 'node:path';
import { test, expect } from '@playwright/test';

// The standalone demo route, derived from this file's location under `app`.
// Route groups such as `(shared)` are not part of the URL.
const route = path
  .dirname(import.meta.filename)
  .split('/app')
  .pop()!
  .replace(/\/\([^)]+\)/g, '');

test('live-garden renders the live preview and editable source', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto(route);
  const demo = page.locator('.demo').first();

  await expect(demo).toContainText('Garden.tsx', { timeout: 15000 });
  // Three flowers with 5, 8 and 12 petals.
  await expect(demo.locator('svg ellipse')).toHaveCount(25);

  // A working demo mounts and renders its content without throwing.
  expect(pageErrors, 'the demo should mount without uncaught errors').toEqual([]);
});

test('live-garden re-renders the preview after editing a line', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto(route);
  const demo = page.locator('.demo').first();
  await expect(demo.locator('svg ellipse')).toHaveCount(25, { timeout: 15000 });

  // use-editable sets contentEditable to 'plaintext-only', so match by presence.
  const editable = demo.locator('pre[contenteditable]').first();

  // Engage the editor once and give the lazy editing engine time to warm up. Until it has,
  // the browser accepts keystrokes that the engine never hears, and nothing in the DOM tells
  // the two states apart, so this mirrors the fixed waits of the `demo-live` test.
  await editable.locator('.line').first().click();
  await page.waitForTimeout(700);

  // Select the whole line and type over it, so the engine sees real keystrokes.
  await editable.locator('.line', { hasText: 'petals={5}' }).first().click();
  await page.waitForTimeout(120);
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await page.keyboard.type('<Flower petals={9} color="plum" label="Edited flower" />');

  // Asserting on the rendered SVG, not the source viewer, proves the edit was transpiled.
  await expect(demo.getByRole('img', { name: 'Edited flower' }).locator('ellipse')).toHaveCount(9, {
    timeout: 15000,
  });
  expect(pageErrors, 'editing should not throw uncaught').toEqual([]);
});
