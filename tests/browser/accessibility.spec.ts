import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test('home is keyboard-operable and has no serious WCAG violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Everything your family needs',
  );
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ['critical', 'serious'].includes(violation.impact ?? ''),
    ),
  ).toEqual([]);
});

test('home remains usable at 200 percent zoom and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await expect(page.getByRole('link', { name: 'Continue my plan' })).toBeVisible();
});

test('guided plan is keyboard-reachable and preserves the safety boundary', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Continue my plan' }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole('heading', { name: 'Start with the essentials.' })).toBeVisible();
  await expect(
    page.getByText('Do not enter passwords, private keys, recovery phrases, or safe combinations.'),
  ).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
