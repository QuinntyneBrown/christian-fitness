import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SsoNotice } from './sso-notice';

@Component({
  imports: [SsoNotice],
  template: `
    <cf-sso-notice heading="No admin access yet" account="events@christian.fitness" spaced>
      Ask an Admin to add you to the team.
      <button slot="actions" type="button">Use another account</button>
    </cf-sso-notice>
  `,
})
class StaffHost {}

async function render(heading: string | null, account: string) {
  const fixture = TestBed.createComponent(SsoNotice);
  if (heading !== null) fixture.componentRef.setInput('heading', heading);
  fixture.componentRef.setInput('account', account);
  await fixture.whenStable();
  return fixture.nativeElement.querySelector('.sso-notice') as HTMLElement;
}

// docs/design-system/components/sso-notice.html: a refusal notice is announced and focused on
// arrival, names the account Google returned as text, and may carry a title and actions.
describe('SsoNotice', () => {
  it('is an alert that takes focus when it appears', async () => {
    const notice = await render("That's not a staff account", 'dana.reyes@gmail.com');

    expect(notice.getAttribute('role')).toBe('alert');
    expect(notice.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(notice);
  });

  it('shows the title, then the account, then the projected text and actions', async () => {
    const fixture = TestBed.createComponent(StaffHost);
    await fixture.whenStable();
    const notice = fixture.nativeElement.querySelector('.sso-notice') as HTMLElement;

    expect(notice.classList).toContain('sso-notice--spaced');
    expect(notice.querySelector('.sso-notice__title')?.textContent?.trim()).toBe(
      'No admin access yet',
    );
    expect(notice.querySelector('.sso-notice__account')?.textContent?.trim()).toBe(
      'events@christian.fitness',
    );
    expect(notice.querySelector('.sso-notice__text')?.textContent?.trim()).toBe(
      'Ask an Admin to add you to the team.',
    );
    expect(notice.querySelector('.sso-notice__actions button')?.textContent).toBe(
      'Use another account',
    );
  });

  it('has no title or actions when given none', async () => {
    const notice = await render(null, 'grace@gracefellowship.ca');

    expect(notice.querySelector('.sso-notice__title')).toBeNull();
    expect(notice.classList).not.toContain('sso-notice--spaced');
    expect(notice.querySelector('.sso-notice__actions:not(:empty)')).toBeNull();
  });

  it('renders the account as text, never as markup', async () => {
    const notice = await render('No admin access yet', '<b>x</b>@example.org');

    expect(notice.querySelector('.sso-notice__account')?.textContent?.trim()).toBe(
      '<b>x</b>@example.org',
    );
    expect(notice.querySelector('b')).toBeNull();
  });
});
