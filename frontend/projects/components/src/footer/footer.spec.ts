import { TestBed } from '@angular/core/testing';
import { Footer } from './footer';

async function render(year?: number) {
  const fixture = TestBed.createComponent(Footer);
  if (year !== undefined) fixture.componentRef.setInput('year', year);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('Footer', () => {
  it('is the page footer with the copyright, the city and the brand line', async () => {
    const el = await render(2026);

    expect(el.querySelector('footer')).not.toBeNull();
    expect([...el.querySelectorAll('footer p')].map((p) => p.textContent)).toEqual([
      '© 2026 Christian Fitness · Toronto',
      'Health · Energy · Abundant life',
    ]);
  });

  it('as the news footer, links to RSS with its mark, Privacy and Terms after the copyright', async () => {
    const fixture = TestBed.createComponent(Footer);
    fixture.componentRef.setInput('variant', 'news');
    fixture.componentRef.setInput('year', 2026);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('footer.site-footer > p')?.textContent).toBe(
      '© 2026 Christian Fitness · Toronto',
    );
    const links = [...el.querySelectorAll('.site-footer__links a')];
    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['RSS', '/feed'],
      ['Privacy', '/privacy'],
      ['Terms', '/terms'],
    ]);
    expect(links[0].querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('names this year when the screen gives none', async () => {
    const el = await render();

    expect(el.querySelector('footer p')?.textContent).toBe(
      `© ${new Date().getFullYear()} Christian Fitness · Toronto`,
    );
  });

  it('links Send feedback to the page it is about and hands a plain click to the app', async () => {
    const fixture = TestBed.createComponent(Footer);
    fixture.componentRef.setInput('variant', 'member');
    fixture.componentRef.setInput('feedbackHref', '/feedback?about=page:events%2F:id');
    const navigated: string[] = [];
    fixture.componentInstance.navigate.subscribe((href) => navigated.push(href));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const link = [...el.querySelectorAll('a')].find((a) => a.textContent === 'Send feedback')!;

    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(plain);
    const modified = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      metaKey: true,
    });
    link.dispatchEvent(modified);

    expect(link.getAttribute('href')).toBe('/feedback?about=page:events%2F:id');
    expect(navigated).toEqual(['/feedback?about=page:events%2F:id']);
    expect(plain.defaultPrevented).toBe(true);
    expect(modified.defaultPrevented).toBe(false);
  });
});
