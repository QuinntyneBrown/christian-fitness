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

  it('names this year when the screen gives none', async () => {
    const el = await render();

    expect(el.querySelector('footer p')?.textContent).toBe(
      `© ${new Date().getFullYear()} Christian Fitness · Toronto`,
    );
  });
});
