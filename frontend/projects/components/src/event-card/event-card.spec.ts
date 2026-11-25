import { TestBed } from '@angular/core/testing';
import { EventCard, eventCardEnd } from './event-card';

const sunrise = {
  href: '/events/easter-sunrise-5k',
  imageSrc: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
  month: 'Apr',
  day: '18',
  date: 'Apr 18',
  type: 'Run',
  time: 'Sat 6:45 AM',
  heading: 'Easter Sunrise 5K',
  place: 'Martin Goodman Trail, Marilyn Bell Park',
  going: 142,
  price: 'Free',
};

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

async function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(EventCard);
  for (const [name, value] of Object.entries({ ...sunrise, ...inputs })) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('eventCardEnd', () => {
  // The footer's end (event-card.html, "Overview"): the price, or scarcity in words.
  it.each<[number | undefined, string, boolean]>([
    [undefined, 'Free', false],
    [6, '6 spots left', true],
    [2, '2 spots left', true],
    [1, '1 spot left', true],
    [0, 'Full', true],
  ])('with %s spots left, reads "%s" (scarce: %s)', (spotsLeft, text, scarce) => {
    expect(eventCardEnd('Free', spotsLeft)).toEqual({ text, scarce });
  });
});

describe('EventCard', () => {
  it('is one link whose name reads type, date, time, title, place, going and price', async () => {
    const el = await render();

    const links = el.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/events/easter-sunrise-5k');
    expect(el.querySelector('button')).toBeNull();
    const name = readableText(links[0]);
    expect(name).toBe(
      'Run · Apr 18, Sat 6:45 AM Easter Sunrise 5K Martin Goodman Trail, Marilyn Bell Park 142 going Free',
    );
  });

  it('reads a session’s series line after the time and before the title; a standalone event has none', async () => {
    const session = await render({
      series: 'Part of Couch to 5K Run Club · Session 3 of 8 · Every Tuesday',
    });
    const standalone = await render();

    expect(readableText(session.querySelector('a')!)).toBe(
      'Run · Apr 18, Sat 6:45 AM Part of Couch to 5K Run Club · Session 3 of 8 · Every Tuesday Easter Sunrise 5K Martin Goodman Trail, Marilyn Bell Park 142 going Free',
    );
    expect(session.querySelector('.event-card__series svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(standalone.querySelector('.event-card__series')).toBeNull();
  });

  it('hides the image and the date badge, and titles the card with a heading', async () => {
    const el = await render();

    expect(el.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(el.querySelector('.date-badge')?.getAttribute('aria-hidden')).toBe('true');
    expect(el.querySelector('h2')?.textContent).toBe('Easter Sunrise 5K');
  });

  it('says "Going" in words only when the member is registered', async () => {
    expect((await render()).querySelector('.going-pill')).toBeNull();
    expect((await render({ registered: true })).querySelector('.going-pill')?.textContent).toBe(
      'Going',
    );
  });
});
