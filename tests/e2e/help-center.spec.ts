import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * The help center as a reader meets it, against the real local stack: the
 * static export and the API on PostgreSQL with pgvector, the extractive
 * writer and the answer check. Nothing is mocked.
 */
test.describe('articles', () => {
  test('the home page lists all 24 articles in each language, with their status labels', async ({ page }) => {
    await page.goto('/en/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The platform, explained');
    await expect(page.locator('main a[href^="/en/articles/"]')).toHaveCount(24);
    await page.goto('/tr/');
    await expect(page.locator('main a[href^="/tr/articles/"]')).toHaveCount(24);
    await expect(page.getByRole('link', { name: /Muhasebe ve finansal zekâ \(LOCAL\)/ })).toBeVisible();
  });

  test('an article shows its sections, its status and its source, and the language switch keeps the page', async ({ page, isMobile }) => {
    await page.goto('/en/articles/hotel-concierge/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hotel concierge and operations (DEMO)');
    await expect(page.locator('#reservation-requests')).toContainText('They are requests, never bookings.');
    await expect(page.getByText('Written from the architecture overview, §6, §7.')).toBeVisible();
    if (!isMobile) {
      await page.getByRole('link', { name: /TR/ }).click();
      await expect(page).toHaveURL(/\/tr\/articles\/hotel-concierge\/$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'tr');
    }
  });

  test('/ sends a reader to a language', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/(en|tr)\/$/);
  });
});

test.describe('the assistant', () => {
  test('answers a status question by code and links the citation to the table row', async ({ page }) => {
    await page.goto('/en/ask/');
    await page.getByRole('button', { name: 'Is the sales website live?' }).click();
    const answer = page.getByRole('region', { name: 'Answer' });
    await expect(answer.getByText('Answered by code from the delivery-status table')).toBeVisible();
    await expect(answer).toContainText('LIVE');
    await answer.getByRole('link', { name: /Source 1: Delivery status at a glance/ }).first().click();
    await expect(page).toHaveURL(/\/en\/articles\/delivery-status\/#sales-website$/);
  });

  test('quotes the articles for an open question, citing the section', async ({ page }) => {
    await page.goto('/en/ask/');
    await page.getByLabel('Your question').fill('Can the shopping assistant place an order?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    const answer = page.getByRole('region', { name: 'Answer' });
    await expect(answer.getByText('Quoted from the articles by code — no language model in this build')).toBeVisible();
    await expect(answer).toContainText('The assistant cannot place an order or change a cart unasked');
    await expect(answer.getByRole('link', { name: 'Commerce storefront (DEMO) — The shopping assistant', exact: true })).toHaveAttribute(
      'href',
      '/en/articles/commerce/#shopping-assistant',
    );
  });

  test('refuses what the articles do not cover, in the reader’s language', async ({ page }) => {
    await page.goto('/tr/ask/');
    await page.getByRole('button', { name: 'Platformun fiyatı nedir?' }).click();
    const answer = page.getByRole('region', { name: 'Yanıt' });
    await expect(answer.getByText('Yardım merkezinin kapsamında değil')).toBeVisible();
    await expect(answer).toContainText('Yardım merkezi fiyat veya fiyatlandırma bilgisi içermiyor.');

    await page.getByLabel('Sorunuz').fill('Bugün İstanbul’da hava nasıl?');
    await page.getByRole('button', { name: 'Sor', exact: true }).click();
    await expect(answer).toContainText('Yardım merkezi bu konuyu kapsamıyor.');
  });

  test('answers every suggested question in both languages without an error', async ({ page }) => {
    for (const locale of ['en', 'tr'] as const) {
      await page.goto(`/${locale}/ask/`);
      const suggestions = page.locator('main ul li button');
      const count = await suggestions.count();
      expect(count).toBe(5);
      const region = page.getByRole('region', { name: locale === 'en' ? 'Answer' : 'Yanıt' });
      for (let index = 0; index < count; index++) {
        const suggestion = (await suggestions.nth(index).textContent()) ?? '';
        await suggestions.nth(index).click();
        await expect(region.locator('article'), suggestion).toBeVisible();
        await expect(region.getByRole('alert'), suggestion).toHaveCount(0);
      }
    }
  });

  test('shows text as text, never as markup', async ({ page }) => {
    await page.goto('/en/ask/');
    await page.getByLabel('Your question').fill('<img src=x onerror=alert(1)> Is the hotel demo live?');
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Answer' }).locator('article')).toBeVisible();
    await expect(page.locator('img')).toHaveCount(0);
  });
});

test.describe('accessibility', () => {
  for (const scheme of ['light', 'dark'] as const) {
    for (const path of ['/en/', '/tr/articles/accounting/', '/en/ask/']) {
      test(`${path} has no detectable WCAG A/AA violations in the ${scheme} theme`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(path);
        if (path.endsWith('/ask/')) {
          await page.getByRole('button', { name: 'Is the sales website live?' }).click();
          await expect(page.getByRole('region', { name: 'Answer' }).locator('article')).toBeVisible();
        }
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        expect(results.violations.map((violation) => `${violation.id}: ${violation.nodes.length}`)).toEqual([]);
      });
    }
  }
});
