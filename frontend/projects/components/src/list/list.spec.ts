import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EventRow } from './event-row';
import { List } from './list';
import { MiniRow } from './mini-row';

interface Row {
  id: string;
  title: string;
}

@Component({
  imports: [List, EventRow],
  template: `
    <cf-list variant="ruled" label="Coming up" [items]="rows" [template]="row" />
    <ng-template #row let-item>
      <cf-event-row
        [href]="'/events/' + item.id"
        month="Apr"
        day="25"
        [heading]="item.title"
        meta="Sat 8:00 AM · Waterfront"
        end="Going"
        [going]="item.id === 'hoops'"
      />
    </ng-template>
  `,
})
class EventsHost {
  readonly rows: readonly Row[] = [
    { id: 'bootcamp', title: 'Saturday Park Bootcamp' },
    { id: 'hoops', title: 'Women’s Hoops & Devotion Night' },
  ];
}

/** The text a screen reader reads: every text node outside `aria-hidden`, joined by spaces. */
function readableText(root: Element): string {
  const parts: string[] = [];
  const walk = (node: Node): void => {
    if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') {
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent ?? '');
    }
    node.childNodes.forEach(walk);
  };
  walk(root);
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ');
}

async function miniRow(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(MiniRow);
  const all = {
    href: '/messages/1',
    name: 'Danielle Okafor',
    time: 'Fri',
    text: 'See you Saturday!',
  };
  for (const [name, value] of Object.entries({ ...all, ...inputs })) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
}

describe('List', () => {
  it('is a labelled list of items, each holding one link that wraps the whole row', async () => {
    const fixture = TestBed.createComponent(EventsHost);
    await fixture.whenStable();
    const list = fixture.nativeElement.querySelector('ul') as HTMLElement;

    expect(list.getAttribute('aria-label')).toBe('Coming up');
    const items = Array.from(list.children);
    expect(items.map((item) => item.tagName)).toEqual(['LI', 'LI']);
    expect(items.map((item) => item.querySelectorAll('a').length)).toEqual([1, 1]);
    const first = items[0].querySelector('a') as HTMLAnchorElement;
    expect(first.getAttribute('href')).toBe('/events/bootcamp');
    expect(readableText(first)).toBe(
      'Apr 25 Saturday Park Bootcamp Sat 8:00 AM · Waterfront Going',
    );
  });
});

describe('MiniRow', () => {
  it('marks the open conversation with aria-current', async () => {
    expect((await miniRow({ current: true })).getAttribute('aria-current')).toBe('true');
    expect((await miniRow({})).getAttribute('aria-current')).toBeNull();
  });

  // Unread is weight plus a count in words, never weight alone (list.html, "States").
  it.each<[number, string | null]>([
    [0, null],
    [1, '1 unread'],
    [3, '3 unread'],
  ])('with %i unread, the count reads %s', async (unread, label) => {
    const row = await miniRow({ unread });

    expect(row.querySelector('.mini-row__count')?.getAttribute('aria-label') ?? null).toBe(label);
  });
});
