import { expect, test } from '../fixtures/test';
import { WebHomePage } from '../page-objects/web/home.page';
import { WebMemberShell } from '../page-objects/web/member-shell.page';

// L2-008 AC4: on a small phone the app header keeps the lockup, the bell, the profile button and
// Sign out inside the window, so no member page scrolls sideways (ADR 0084). 320 px is also the
// width WCAG 1.4.10 (Reflow) asks for.
test.describe('Member app, header on a small phone', () => {
  for (const width of [360, 320]) {
    test(`at ${width} px Home does not scroll sideways and every header control is in view`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      const home = new WebHomePage(page);
      const shell = new WebMemberShell(page);

      await home.open();
      await expect(home.greeting).toHaveText('Welcome, Grace');

      expect(await shell.horizontalOverflow()).toBe(0);
      await expect(shell.lockup).toHaveAccessibleName('Christian Fitness');
      for (const control of [shell.lockup, shell.bell, shell.profileButton, shell.signOutButton]) {
        await expect(control).toBeInViewport({ ratio: 1 });
      }
      expect(await shell.bellBox()).toEqual({ width: 44, height: 44 });
      const signOut = await shell.signOutBox();
      expect(signOut.width).toBeGreaterThanOrEqual(44);
      expect(signOut.height).toBeGreaterThanOrEqual(44);
    });
  }
});
