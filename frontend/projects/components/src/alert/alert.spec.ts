import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Alert, type AlertTone } from './alert';

@Component({
  imports: [Alert],
  template: `
    <input id="f-email" />
    <cf-alert heading="Fix 1 thing to create your profile" [items]="items">
      Nothing typed is lost.
    </cf-alert>
  `,
})
class SummaryHost {
  readonly items = [{ text: 'Enter an email address', target: 'f-email' }];
}

async function render(tone: AlertTone, heading = 'Your request didn’t send') {
  const fixture = TestBed.createComponent(Alert);
  fixture.componentRef.setInput('tone', tone);
  fixture.componentRef.setInput('heading', heading);
  await fixture.whenStable();
  return fixture.nativeElement.querySelector('.form-alert') as HTMLElement;
}

describe('Alert', () => {
  // One row per tone in the design system's states table (alert.html, "States").
  it.each<[AlertTone, string]>([
    ['danger', 'alert'],
    ['info', 'status'],
    ['success', 'status'],
  ])('a %s alert is announced with role %s', async (tone, role) => {
    const alert = await render(tone);

    expect(alert.getAttribute('role')).toBe(role);
  });

  it('takes focus when it appears, so the explanation is read first', async () => {
    const alert = await render('danger');

    expect(document.activeElement).toBe(alert);
  });

  it('stays where focus is when told not to take it', async () => {
    const fixture = TestBed.createComponent(Alert);
    fixture.componentRef.setInput('heading', 'Check your inbox');
    fixture.componentRef.setInput('focusOnShow', false);
    await fixture.whenStable();

    expect(document.activeElement).not.toBe(fixture.nativeElement.querySelector('.form-alert'));
  });

  it('renders the heading as text, never as markup', async () => {
    const alert = await render('danger', '<b>Bold</b>');

    expect(alert.querySelector('.form-alert__title')?.textContent).toBe('<b>Bold</b>');
    expect(alert.querySelector('b')).toBeNull();
  });

  it('as an error summary, is labelled by its title and moves focus to the field a link names', async () => {
    const fixture = TestBed.createComponent(SummaryHost);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const alert = host.querySelector('.form-alert') as HTMLElement;
    const title = host.querySelector('.form-alert__title') as HTMLElement;

    expect(alert.getAttribute('aria-labelledby')).toBe(title.id);
    expect(host.textContent).toContain('Nothing typed is lost.');

    const link = host.querySelector('.form-alert__list a') as HTMLAnchorElement;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(host.querySelector('#f-email'));
  });
});
