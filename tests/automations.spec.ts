import { test, expect } from '@playwright/test';

test.describe('Smart Automation Builder', () => {
  test('should open modal, toggle trigger type, and save new automation', async ({ page }) => {
    // Navigate to automations page
    await page.goto('/automations');

    // Make sure we are on the page (check for header text)
    await expect(page.getByRole('heading', { name: 'Automatiseringen' })).toBeVisible();

    // Click 'Nieuwe wekker' or 'Toevoegen' button (the one in the header with the plus icon)
    await page.getByRole('button', { name: /Nieuwe|Toevoegen/i }).first().click();

    // Verify modal is opened
    await expect(page.getByRole('heading', { name: 'Nieuwe automatisering' })).toBeVisible();

    // Enter name
    await page.getByLabel('Naam').fill('Test Playwright E2E Automation');

    // Toggle trigger type to "Rooster (Smart)"
    await page.getByRole('button', { name: 'Rooster (Smart)' }).click();

    // Verify Shift selection is visible
    await expect(page.getByText('Kies de Dienst')).toBeVisible();

    // Select "Laat" shift
    await page.getByRole('button', { name: 'Laat', exact: true }).click();

    // Click Opslaan
    await page.getByRole('button', { name: 'Opslaan' }).click();

    // Modal should close (heading no longer visible)
    await expect(page.getByRole('heading', { name: 'Nieuwe automatisering' })).not.toBeVisible();

    // The new automation should be in the list
    await expect(page.getByText('Test Playwright E2E Automation')).toBeVisible();
    await expect(page.getByText('Alleen op Laat dienst')).toBeVisible();
  });
});
