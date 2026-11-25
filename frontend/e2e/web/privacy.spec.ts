import { expect, test, SIGNED_IN } from '../fixtures/test';
import { LegalPage } from '../page-objects/web/legal.page';

for (const signedIn of [false, true]) {
  test(
    'Read Privacy Policy ' + (signedIn ? 'as a member' : 'as a visitor'),
    async ({ page, api }) => {
      const calls: string[] = [];
      page.on('request', (request) => {
        if (new URL(request.url()).pathname.startsWith('/api/')) calls.push(request.method());
      });
      if (signedIn) api.on('GET', '/api/session', () => ({ json: SIGNED_IN }));
      const legal = new LegalPage(page);
      await legal.open('/privacy');
      await expect(legal.heading).toHaveText('Privacy Policy');
      await expect(page).toHaveTitle('Privacy Policy · Christian Fitness');
      await expect(legal.effective).toHaveText('Effective April 1, 2026');
      await expect(legal.summary).toBeVisible();
      await expect(legal.note).toContainText('The full text below is what applies');
      await expect(legal.sections).toHaveCount(9);
      await expect(legal.contact).toContainText('privacy@christian.fitness');
      await expect(legal.contact).toContainText(
        '2091 Hurontario Street, Mississauga, Ontario, L5A 4E6',
      );
      await expect(legal.contact.getByRole('link', { name: 'Send feedback' })).toHaveAttribute(
        'href',
        '/feedback',
      );
      await expect(legal.headerLink('Terms of Service')).toHaveAttribute('href', '/terms');
      await expect(legal.headerLink('Christian Fitness')).toHaveAttribute('href', '/');
      expect(calls).toEqual([]);
    },
  );
}
