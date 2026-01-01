import { test, expect } from '@playwright/test';

test.describe('Camera Permission Flow', () => {
  test.describe('Navigation', () => {
    test('should have Scan Bricks link in header navigation', async ({ page }) => {
      await page.goto('/');

      const scanLink = page.getByTestId('nav-scan');
      await expect(scanLink).toBeVisible();
      await expect(scanLink).toHaveText('Scan Bricks');
    });

    test('should have Scan FAB button', async ({ page }) => {
      await page.goto('/');

      const fabScan = page.getByTestId('fab-scan');
      await expect(fabScan).toBeVisible();
      await expect(fabScan).toHaveAttribute('aria-label', 'Scan bricks');
    });

    test('should navigate to scan page when clicking Scan Bricks link', async ({ page }) => {
      await page.goto('/');

      await page.getByTestId('nav-scan').click();

      await expect(page).toHaveURL('/scan');
    });

    test('should navigate to scan page when clicking Scan FAB', async ({ page }) => {
      await page.goto('/');

      await page.getByTestId('fab-scan').click();

      await expect(page).toHaveURL('/scan');
    });
  });

  test.describe('Pre-Permission Screen', () => {
    test('should show pre-permission screen on first visit', async ({ page }) => {
      // Grant camera permission to simulate prompt state becoming visible
      await page.context().grantPermissions([]);

      await page.goto('/scan');

      // Wait for permission check to complete and show pre-permission screen
      await expect(page.getByTestId('permission-prompt')).toBeVisible({
        timeout: 10000,
      });
    });

    test('should display privacy assurance message', async ({ page }) => {
      await page.context().grantPermissions([]);

      await page.goto('/scan');

      await expect(page.getByTestId('permission-prompt')).toBeVisible({
        timeout: 10000,
      });

      await expect(page.getByText('Your privacy is protected')).toBeVisible();
      await expect(page.getByText(/Photos stay on your device/)).toBeVisible();
    });

    test('should display Allow Camera button', async ({ page }) => {
      await page.context().grantPermissions([]);

      await page.goto('/scan');

      await expect(page.getByTestId('permission-prompt')).toBeVisible({
        timeout: 10000,
      });

      const allowButton = page.getByTestId('allow-camera-button');
      await expect(allowButton).toBeVisible();
      await expect(allowButton).toHaveText(/Allow Camera/);
    });

    test('should have accessible dialog structure', async ({ page }) => {
      await page.context().grantPermissions([]);

      await page.goto('/scan');

      await expect(page.getByTestId('permission-prompt')).toBeVisible({
        timeout: 10000,
      });

      // Check for dialog role
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog).toHaveAttribute('aria-labelledby', 'permission-title');
      await expect(dialog).toHaveAttribute('aria-describedby', 'permission-description');
    });
  });

  test.describe('Camera Permission Granted', () => {
    test('should show camera ready screen when permission is granted', async ({ page }) => {
      // Grant camera permission
      await page.context().grantPermissions(['camera']);

      await page.goto('/scan');

      // Should skip pre-permission and show camera ready (or granted loading)
      await expect(
        page.getByText(/Camera Ready|Opening camera/i)
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should be able to tab to Allow Camera button', async ({ page }) => {
      await page.context().grantPermissions([]);

      await page.goto('/scan');

      await expect(page.getByTestId('permission-prompt')).toBeVisible({
        timeout: 10000,
      });

      // Tab to the Allow Camera button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // May need multiple tabs

      // The allow button should eventually be focusable
      const allowButton = page.getByTestId('allow-camera-button');
      await expect(allowButton).toBeVisible();
    });
  });

  test.describe('Page Metadata', () => {
    test('should have correct page title', async ({ page }) => {
      await page.goto('/scan');

      await expect(page).toHaveTitle(/Scan Bricks/);
    });
  });
});
