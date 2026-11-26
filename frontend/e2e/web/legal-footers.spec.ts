import { test, expect } from '../fixtures/test';
import { answerHome } from '../fixtures/events';
import { answerLanding, answerFeatured } from '../fixtures/public-events';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebLandingPage } from '../page-objects/web/landing.page';

test('Visitors find both documents in the landing footer', async ({ page, api }) => {
  api.on('GET', '/api/session', () => ({ status: 401, json: { code: 'unauthenticated' } }));
  answerLanding(api, []);
  answerFeatured(api, []);
  const landing = new WebLandingPage(page);
  await landing.open();
  await expect(landing.footerLink('Privacy')).toHaveAttribute('href', '/privacy');
  await expect(landing.footerLink('Terms')).toHaveAttribute('href', '/terms');
});
test('Members find both documents and settings at the end of Home', async ({ page, api }) => {
  answerHome(api, { nextEvent: null, suggested: [] });
  const home = new WebHomePage(page);
  await home.open();
  for (const [name, href] of [
    ['Privacy', '/privacy'],
    ['Terms', '/terms'],
    ['Preferences', '/preferences'],
    ['Send feedback', '/feedback'],
  ]) {
    await expect(home.footerLink(name)).toHaveAttribute('href', href);
  }
});
