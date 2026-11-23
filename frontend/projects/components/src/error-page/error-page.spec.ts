import { TestBed } from '@angular/core/testing';
import { ErrorPage } from './error-page';

async function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(ErrorPage);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('ErrorPage', () => {
  it('hides the decorative code, names the page in its only heading and moves focus to it', async () => {
    const el = await render({
      code: '404',
      heading: 'Page not found',
      text: 'That link may be old, or the page has moved.',
    });

    expect(el.querySelector('.system__code')?.getAttribute('aria-hidden')).toBe('true');
    const heading = el.querySelector('h1') as HTMLElement;
    expect(heading.textContent).toBe('Page not found');
    expect(document.activeElement).toBe(heading);
  });

  it('as the admin console’s staff card, names the console, explains and moves focus to its heading', async () => {
    const el = await render({
      variant: 'staff',
      eyebrow: 'Admin console',
      heading: 'Staff only',
      text: 'The admin console is for the Christian Fitness team.',
      note: 'On the team? Ask a community director to give you staff access.',
    });

    expect(el.querySelector('.system__code')).toBeNull();
    expect(el.querySelector('.staff__card')?.textContent).toContain('Admin console');
    expect(el.querySelector('.staff__note')?.textContent).toBe(
      'On the team? Ask a community director to give you staff access.',
    );
    const heading = el.querySelector('h1') as HTMLElement;
    expect(heading.textContent).toBe('Staff only');
    expect(document.activeElement).toBe(heading);
  });
});
