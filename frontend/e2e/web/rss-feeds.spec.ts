import { expect, test } from '../fixtures/test';
import { WebLandingPage } from '../page-objects/web/landing.page';

// L2-060 AC3 and L2-001 AC9 (journey 26; ADR 0108, ADR 0110): the landing page names the feeds in
// its head so a reader finds them from the site's address, and its footer links to the newsletter
// and to the feeds on Subscribe.
test.describe('Member app, RSS feeds', () => {
  test(
    'the landing page names All stories and the five section feeds in its head and links to the newsletter and RSS in its footer',
    { tag: '@critical' },
    async ({ page, api }) => {
      api.on('GET', '/api/session', () => ({ status: 401, json: { code: 'unauthenticated' } }));
      const landing = new WebLandingPage(page);

      await landing.open();

      expect(await landing.feeds()).toEqual([
        { title: 'Christian Fitness: All stories', href: '/feed' },
        { title: 'Christian Fitness: Events', href: '/events/feed' },
        { title: 'Christian Fitness: Training', href: '/training/feed' },
        { title: 'Christian Fitness: Nutrition', href: '/nutrition/feed' },
        { title: 'Christian Fitness: Faith & Body', href: '/faith-body/feed' },
        { title: 'Christian Fitness: Community', href: '/community/feed' },
      ]);
      await expect(landing.footerLink('Newsletter')).toHaveAttribute('href', '/subscribe');
      await expect(landing.footerLink('RSS')).toHaveAttribute('href', '/subscribe#rss');
      expect(await landing.footerLinks()).toEqual(['Newsletter', 'RSS', 'Privacy', 'Terms']);
    },
  );
});
