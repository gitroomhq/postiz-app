import { expect, test } from '../fixtures';

/**
 * Browser coverage of the shell and the redirect rules in apps/frontend/src/proxy.ts.
 *
 * The frontend has effectively no data-testid attributes and its inputs carry
 * no id/htmlFor, so selection here is by role, placeholder, href and the few
 * stable ids (#left-menu, #add-edit-modal). Visible copy goes through
 * t('key', 'English default'), so the English fallback is the literal string.
 */
test.describe('unauthenticated', () => {
  test('redirects a protected route to the auth screen', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/launches');

    await expect(page).toHaveURL(/\/auth/);
  });

  test('renders the login form', async ({ page }) => {
    await page.context().clearCookies();

    await page.goto('/auth/login');

    await expect(page.getByPlaceholder('Email Address')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
  });
});

test.describe('authenticated', () => {
  test('renders the application shell', async ({ signedInPage: page }) => {
    await page.goto('/launches');

    // LayoutComponent renders null until useSWR('/user/self') resolves, so
    // the menu appearing is the honest "the app is alive" signal.
    await expect(page.locator('#left-menu')).toBeVisible({ timeout: 60_000 });
  });

  test('shows the connected channel by name', async ({ org, signedInPage: page }) => {
    await page.goto('/launches');
    await expect(page.locator('#left-menu')).toBeVisible({ timeout: 60_000 });

    await expect(page.getByText(org.integration.name).first()).toBeVisible();
  });

  test('bounces away from the auth screen when already signed in', async ({
    signedInPage: page,
  }) => {
    await page.goto('/auth/login');

    await expect(page).not.toHaveURL(/\/auth\/login/);
  });

  test('clears the session on logout', async ({ signedInPage: page }) => {
    await page.goto('/auth/logout');

    await expect(page).toHaveURL(/\/auth\/login/);
    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === 'auth')?.value ?? '').toBe('');
  });
});
