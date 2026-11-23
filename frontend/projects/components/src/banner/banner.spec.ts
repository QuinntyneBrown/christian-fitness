import { TestBed } from '@angular/core/testing';
import { Banner, type BannerTone } from './banner';

async function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(Banner);
  for (const [name, value] of Object.entries({ lead: 'You’re offline.', ...inputs })) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return { fixture, banner: fixture.nativeElement.querySelector('.banner') as HTMLElement };
}

describe('Banner', () => {
  // One row per tone in the design system's states table (banner.html, "States"): danger is
  // assertive because a service the person relies on is failing; every other tone is polite.
  it.each<[BannerTone, string]>([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'status'],
    ['danger', 'alert'],
    ['brand', 'status'],
  ])('a %s banner is announced with role %s', async (tone, role) => {
    const { banner } = await render({ tone });

    expect(banner.getAttribute('role')).toBe(role);
  });

  it('has no Dismiss while its condition is still true', async () => {
    const { banner } = await render({ tone: 'warning' });

    expect(banner.querySelector('.banner__close')).toBeNull();
  });

  it('when dismissible, emits dismissed from a button named "Dismiss"', async () => {
    const { fixture, banner } = await render({ tone: 'info', dismissible: true });
    let dismissed = 0;
    fixture.componentInstance.dismissed.subscribe(() => dismissed++);

    const close = banner.querySelector('.banner__close') as HTMLButtonElement;
    expect(close.getAttribute('aria-label')).toBe('Dismiss');
    close.click();

    expect(dismissed).toBe(1);
  });

  it('offers its action as a link when it has an address, and as a button that emits otherwise', async () => {
    const linked = await render({ actionLabel: 'Resend', actionHref: '/resend' });
    expect(linked.banner.querySelector('a.banner__action')?.getAttribute('href')).toBe('/resend');

    const { fixture, banner } = await render({ actionLabel: 'Resend' });
    let acted = 0;
    fixture.componentInstance.action.subscribe(() => acted++);
    (banner.querySelector('button.banner__action') as HTMLButtonElement).click();

    expect(acted).toBe(1);
  });

  it('renders its words as text', async () => {
    const { banner } = await render({ lead: '<i>x</i>', text: '<b>y</b>' });

    expect(banner.querySelector('.banner__text')?.textContent).toContain('<i>x</i> <b>y</b>');
    expect(banner.querySelector('i, b')).toBeNull();
  });
});
