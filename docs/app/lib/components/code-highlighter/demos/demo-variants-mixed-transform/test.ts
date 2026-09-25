import path from 'node:path';
import { test, expect } from '@playwright/test';

// The standalone demo route, derived from this file's location under `app`.
const route = path
  .dirname(import.meta.filename)
  .split('/app')
  .pop()!;

// The first variant has no transform (its JS version only renames the file), the
// second is TypeScript with a JS transform. The highlighter considers the first
// variant current, while the JS toggle belongs to the second: switching to the
// second, then to JS, must paint each final tree at once, with no re-flow.
test('switches into the TypeScript variant and to JS without re-flowing after either swap', async ({
  page,
}) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto(`${route}/demo-plain`);
  const code = page.locator('pre').first();
  await expect(code).toContainText('Clicked 0 times', { timeout: 15000 });
  await expect(page.getByRole('button', { name: 'JS' })).toHaveCount(0);

  // Record what the code shows after every change to the page, from here on: its
  // text, and the markup of the frames in its collapsed window. (Frames outside
  // the window are highlighted lazily, once visible, so they may change later.)
  // The observer watches the page, since a swap may replace the `pre` itself.
  await page.evaluate(() => {
    const snapshots: string[] = [];
    (window as unknown as { preSnapshots: string[] }).preSnapshots = snapshots;
    new MutationObserver(() => {
      const pre = document.querySelector('pre');
      const windowFrames = Array.from(pre?.querySelectorAll('.frame[data-frame-type]') ?? []);
      const snapshot = `${pre?.textContent}\n${windowFrames.map((frame) => frame.outerHTML).join('')}`;
      if (snapshot !== snapshots[snapshots.length - 1]) {
        snapshots.push(snapshot);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
  const snapshots = () =>
    page.evaluate(() => (window as unknown as { preSnapshots: string[] }).preSnapshots);

  await page.getByText('PlainCount', { exact: true }).click();
  await page.getByRole('option', { name: 'TypedCount' }).click();
  await expect(code).toContainText('interface CounterProps', { timeout: 15000 });

  await page.getByRole('button', { name: 'JS' }).click();
  await expect(page.getByText('Counter.jsx')).toBeVisible({ timeout: 15000 });
  await expect(code).not.toContainText('interface CounterProps');
  await expect(code).toContainText('<output>');

  // Give a late re-render time to land, then check each swap painted its final
  // tree: what the code shows never changed after the variant's first TypeScript
  // render, or after its first JS render.
  await page.waitForTimeout(1000);
  const shown = await snapshots();
  const firstJs = shown.findIndex(
    (snapshot) => snapshot.includes('<output>') && !snapshot.includes('CounterProps'),
  );
  expect(firstJs).toBeGreaterThanOrEqual(0);
  expect(new Set(shown.slice(firstJs)).size).toBe(1);
  const typed = shown.slice(0, firstJs).filter((snapshot) => snapshot.includes('CounterProps'));
  expect(new Set(typed).size).toBe(1);

  expect(pageErrors, 'the demo should swap without uncaught errors').toEqual([]);
});
