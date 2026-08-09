import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test('home is keyboard-operable and has no serious WCAG violations', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.headers()['x-content-type-options']).toBe('nosniff');
  expect(response?.headers()['x-frame-options']).toBe('DENY');
  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
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
  await expect(page.getByRole('link', { name: 'Continue my plan' })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.zoom = '2';
  });
  await expect(page.getByRole('link', { name: 'Continue my plan' })).toBeVisible();
  await page.evaluate(() => {
    document.documentElement.style.zoom = '';
  });
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

for (const route of [
  '/sign-in',
  '/recover',
  '/settings/security',
  '/packets',
  '/privacy',
  '/recipient/verify',
  '/recipient/release',
]) {
  test(`${route} exposes labelled controls without serious accessibility violations`, async ({
    page,
  }) => {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.filter((violation) =>
        ['critical', 'serious'].includes(violation.impact ?? ''),
      ),
    ).toEqual([]);
  });
}

test('primary navigation and forms remain usable at a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/sign-in');
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
  await expect(page.getByLabel('Household tenant ID')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
