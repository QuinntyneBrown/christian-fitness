import { TestBed } from '@angular/core/testing';
import { Link } from '../public-api';

function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(Link);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).querySelector('a')!;
}

describe('Link', () => {
  it('goes where its href says, in the same tab', () => {
    const link = render({ href: '/guidelines' });

    expect(link.getAttribute('href')).toBe('/guidelines');
    expect(link.hasAttribute('target')).toBe(false);
  });

  it('opens an external link in a new tab and says so to screen readers', () => {
    const link = render({ href: 'https://example.org', external: true });

    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.querySelector('.visually-hidden')?.textContent).toBe(' (opens in a new tab)');
    expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it.each([
    [true, 'page'],
    [false, null],
  ])('marks the link to the current page when current is %s', (current, expected) => {
    const link = render({ href: '/events', current });

    expect(link.getAttribute('aria-current')).toBe(expected);
  });
});
