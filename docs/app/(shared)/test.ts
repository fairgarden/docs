import * as fs from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';

test('landing page renders its content and demos', async ({ page }) => {
  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));

  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1, name: 'FairGarden Docs' })).toBeVisible();

  // The featured demo renders its preview beside its source.
  const hero = page.locator('.demo').first();
  await expect(hero.getByRole('img', { name: 'A flower with 8 petals' })).toBeVisible({
    timeout: 15000,
  });
  await expect(hero).toContainText('PetalSlider.tsx');

  // The API reference is generated from the component's types.
  await expect(page.getByRole('cell', { name: 'petals', exact: true })).toBeVisible();

  // The markdown fallback links are stripped from the rendered page.
  await expect(page.getByRole('link', { name: 'See Demo' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'See Types' })).toHaveCount(0);

  expect(pageErrors, 'the page should render without uncaught errors').toEqual([]);
});

test('landing page links resolve to clean URLs', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/lib');
  await expect(
    page.getByRole('link', { name: 'Read how the numbers were measured' }),
  ).toHaveAttribute('href', '/lib/patterns/prop-compression#measured-impact');
});

test('landing page questions expand to reveal their answers', async ({ page }) => {
  await page.goto('/');

  const question = page.getByRole('button', { name: 'Does it work with Turbopack?' });
  await expect(question).toHaveAttribute('aria-expanded', 'false');

  await question.click();

  await expect(question).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('registers every loader as both a Turbopack rule')).toBeVisible();
});

test('landing page folds a code block down to its focused region', async ({ page }) => {
  await page.goto('/');

  const band = page.locator('section', {
    has: page.getByRole('heading', { name: 'Point at the lines that matter' }),
  });
  const written = band.locator('pre').nth(0);
  const readers = band.locator('pre').nth(1);

  // The file as written starts expanded and keeps its directives.
  await expect(written.getByText('@focus-start')).toBeVisible({ timeout: 15000 });

  // Readers get the focused region without the directives, and the rest is folded away.
  await expect(readers.getByText('PetalInput value=')).toBeVisible();
  await expect(readers.getByText('@focus-start')).toHaveCount(0);
  await expect(readers.getByText("from './PetalInput'")).toBeHidden();

  // The toggle state is lost if the block's content replaces its loading fallback after
  // the click. Its copy button only gets this label once the content is in place.
  await band.scrollIntoViewIfNeeded();
  await expect(band.getByRole('button', { name: 'Copy Garden.tsx source' }).nth(1)).toBeVisible({
    timeout: 15000,
  });

  await band.locator('label').nth(1).click();

  await expect(readers.getByText("from './PetalInput'")).toBeVisible();
});

test('landing page shows the featured demo file as it is on disk', async () => {
  const directory = path.dirname(import.meta.filename);
  const [page, demo] = await Promise.all([
    fs.readFile(path.join(directory, 'page.mdx'), 'utf8'),
    fs.readFile(path.join(directory, 'demos/petal-slider/index.ts'), 'utf8'),
  ]);

  // The page says the demo at the top "is the file below", so the snippet must not drift.
  expect(page).toContain(demo.trim());
});
