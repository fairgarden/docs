import path from 'node:path';
import { test, expect } from '@playwright/test';

// The standalone demo route, derived from this file's location under `app`.
// Route groups such as `(shared)` are not part of the URL.
const route = path
  .dirname(import.meta.filename)
  .split('/app')
  .pop()!
  .replace(/\/\([^)]+\)/g, '');

test('petal-slider renders the flower beside its source', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto(route);
  const demo = page.locator('.demo').first();

  await expect(demo).toContainText('8 petals', { timeout: 15000 });
  await expect(demo.getByRole('img', { name: 'A flower with 8 petals' })).toBeVisible();
  await expect(demo).toContainText('PetalSlider.module.css');

  // A working demo mounts and renders its content without throwing.
  expect(pageErrors, 'the demo should mount without uncaught errors').toEqual([]);
});

test('petal-slider redraws the flower when the slider moves', async ({ page }) => {
  await page.goto(route);
  const demo = page.locator('.demo').first();
  await expect(demo).toContainText('8 petals', { timeout: 15000 });

  // The preview remounts, losing its state, when the demo's code content replaces the loading
  // fallback. The tabs are disabled until then, so wait for them before interacting.
  await expect(
    demo.locator('[role="tab"][aria-disabled="true"], [role="tab"][disabled]'),
  ).toHaveCount(0, { timeout: 15000 });

  await demo.getByRole('slider').press('ArrowRight');

  await expect(demo).toContainText('9 petals');
  await expect(
    demo.getByRole('img', { name: 'A flower with 9 petals' }).locator('ellipse'),
  ).toHaveCount(9);
});

test('petal-slider keeps every file in the initial HTML as plain text', async ({ request }) => {
  const response = await request.get(route);

  // Scripts carry the hydration payload. Crawlers read the markup around them.
  const markup = (await response.text()).replace(/<script[\s\S]*?<\/script>/g, '');

  // The stylesheet sits behind the second tab, yet its text is already in the document.
  expect(markup).toContain('data-filename="PetalSlider.module.css"');
  expect(markup).toContain('justify-items: center');
});
