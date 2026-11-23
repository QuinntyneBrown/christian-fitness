import { TestBed } from '@angular/core/testing';
import { DescriptionList, type DescriptionItem } from './description-list';

async function render(items: readonly DescriptionItem[], variant: 'facts' | 'spec' = 'spec') {
  const fixture = TestBed.createComponent(DescriptionList);
  fixture.componentRef.setInput('items', items);
  fixture.componentRef.setInput('variant', variant);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('DescriptionList', () => {
  it('pairs each term with its value in a native list, grouped in divs', async () => {
    const el = await render([
      { term: 'Credentials', detail: 'Registered Dietitian' },
      { term: 'Rate', detail: '$95 first consult' },
    ]);

    const pairs = Array.from(el.querySelectorAll('dl > div')).map((pair) => [
      pair.querySelector('dt')?.textContent,
      pair.querySelector('dd')?.textContent,
    ]);
    expect(pairs).toEqual([
      ['Credentials', 'Registered Dietitian'],
      ['Rate', '$95 first consult'],
    ]);
  });

  // A missing optional value (description-list.html, "States"), one row per case.
  it.each<[string | undefined | null, string]>([
    ['Grace Fellowship, Scarborough', 'Grace Fellowship, Scarborough'],
    [undefined, 'Not shared'],
    [null, 'Not shared'],
    ['', 'Not shared'],
  ])('a value of %j reads "%s"', async (detail, shown) => {
    const el = await render([{ term: 'Home church', detail }]);

    expect(el.querySelector('dd')?.textContent).toBe(shown);
  });

  it('hides a fact’s icon, since its term already says it', async () => {
    const el = await render(
      [{ term: 'Sat, Apr 18', detail: '6:45 AM', icon: 'calendar' }],
      'facts',
    );

    expect(el.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
