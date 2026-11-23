import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EventGrid } from './event-grid';

@Component({
  imports: [EventGrid],
  template: `
    <cf-event-grid [items]="items()" [template]="card" />
    <ng-template #card let-item
      ><span class="card">{{ item.id }}</span></ng-template
    >
  `,
})
class Host {
  items = signal([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
}

// docs/design-system/components/event-card.html, ".event-grid": a list of cards, one per item.
describe('EventGrid', () => {
  it('lists each item as a list item holding its card, in order', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    const list = fixture.nativeElement.querySelector('ul.event-grid') as HTMLElement;
    const items = Array.from(list.querySelectorAll(':scope > li'));
    expect(items.map((item) => item.querySelector('.card')?.textContent)).toEqual(['a', 'b', 'c']);
  });

  it('adds a card for an item added later and keeps the cards it has', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const first = fixture.nativeElement.querySelector('.card') as HTMLElement;

    fixture.componentInstance.items.update((items) => [...items, { id: 'd' }]);
    await fixture.whenStable();

    const cards = Array.from(fixture.nativeElement.querySelectorAll('.card')) as HTMLElement[];
    expect(cards.map((card) => card.textContent)).toEqual(['a', 'b', 'c', 'd']);
    expect(cards[0]).toBe(first);
  });
});
