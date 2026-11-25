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

  // Unread is weight plus a signal read in words, never weight alone (list.html, "States"): a
  // person row shows the unread dot, a conversation the count pill (badge.html).
  it.each<[boolean, number, string | null, string | null]>([
    [false, 0, null, null],
    [false, 3, 'unread-dot', ''],
    [true, 0, null, null],
    [true, 1, 'count-pill', '1'],
    [true, 3, 'count-pill', '3'],
  ])(
    'as a conversation %s with %i unread, shows %s with text %j',
    async (conversation, unread, block, text) => {
      const row = await miniRow({ conversation, unread });

      const signal = row.querySelector('[aria-label$=" unread"]');
      expect(signal?.getAttribute('class') ?? null).toBe(block);
      expect(signal?.getAttribute('aria-label') ?? null).toBe(block ? `${unread} unread` : null);
      expect(signal?.textContent?.trim() ?? null).toBe(text);
    },
  );
});

describe('MiniRow meta line', () => {
  it("shows an event group's member count under the name, and nothing without one", async () => {
    const row = await miniRow({ conversation: true, meta: '18 members' });
    expect(row.querySelector('.mini-row__meta')?.textContent).toBe('18 members');
    expect((await miniRow({ conversation: true })).querySelector('.mini-row__meta')).toBeNull();
  });
});

// L2-055 AC4 (ADR 0087): a Connected row is routed by the screen; the inbox's rows stay plain links.
describe('MiniRow routing', () => {
  async function clicked(routed: boolean, init: MouseEventInit = {}) {
    const fixture = TestBed.createComponent(MiniRow);
    fixture.componentRef.setInput('href', '/directory/l-1');
    fixture.componentRef.setInput('name', 'Northline Athletic');
    fixture.componentRef.setInput('routed', routed);
    const emitted: string[] = [];
    fixture.componentInstance.navigate.subscribe((href) => emitted.push(href));
    await fixture.whenStable();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    link.dispatchEvent(click);
    return { emitted, prevented: click.defaultPrevented };
  }

  it('hands a plain click on a routed row to the screen', async () => {
    expect(await clicked(true)).toEqual({ emitted: ['/directory/l-1'], prevented: true });
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { button: 1 }])(
    'leaves a modified click (%o) to the browser',
    async (init) => {
      expect(await clicked(true, init)).toEqual({ emitted: [], prevented: false });
    },
  );

  it('leaves every click on a row that is not routed to the browser', async () => {
    expect(await clicked(false)).toEqual({ emitted: [], prevented: false });
  });
});
