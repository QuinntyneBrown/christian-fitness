import { TestBed } from '@angular/core/testing';
import type { StoryBlock, StoryRun } from '@cf/api';
import { Story, type StoryMoreCard, type StoryNextCard } from './story';

const run = (text: string, marks: Partial<StoryRun> = {}): StoryRun => ({
  text,
  em: false,
  strong: false,
  href: null,
  ...marks,
});

async function render(blocks: StoryBlock[], next: StoryNextCard | null = null) {
  const fixture = TestBed.createComponent(Story);
  fixture.componentRef.setInput('headline', 'Fasting and training');
  fixture.componentRef.setInput('blocks', blocks);
  fixture.componentRef.setInput('next', next);
  await fixture.whenStable();
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.story__body')!;
}

// L2-069 AC10 (ADR 0097): the story shows the renderer's blocks as text, never HTML.
describe('Story', () => {
  it('sets marked words beside the words around them, adding no space', async () => {
    const body = await render([
      {
        kind: 'paragraph',
        runs: [
          run('Ask '),
          run('Lena', { em: true }),
          run(', then '),
          run('rest', { strong: true }),
          run('.'),
        ],
      },
    ]);

    expect(body.querySelector('p')?.textContent).toBe('Ask Lena, then rest.');
    expect(body.querySelector('em')?.textContent).toBe('Lena');
    expect(body.querySelector('strong')?.textContent).toBe('rest');
  });

  it('renders typed HTML as its words and links only the runs that carry an address', async () => {
    const body = await render([
      {
        kind: 'paragraph',
        runs: [run('<img src=x onerror=alert(1)> '), run('Lena', { href: 'https://example.org' })],
      },
    ]);

    expect(body.querySelector('img')).toBeNull();
    expect(body.querySelector('p')?.textContent).toBe('<img src=x onerror=alert(1)> Lena');
    const links = body.querySelectorAll('a');
    expect([links.length, links[0].getAttribute('href'), links[0].textContent]).toEqual([
      1,
      'https://example.org',
      'Lena',
    ]);
  });

  it('draws a quote, a heading, a subheading and both kinds of list', async () => {
    const body = await render([
      { kind: 'quote', runs: [run('Keep moving.')] },
      { kind: 'heading', level: 2, runs: [run('Before')] },
      { kind: 'heading', level: 3, runs: [run('Water')] },
      { kind: 'list', ordered: false, items: [[run('One')], [run('Two')]] },
      { kind: 'list', ordered: true, items: [[run('First')]] },
    ]);

    expect(
      [...body.children].map((child) => `${child.tagName}:${child.textContent?.trim()}`),
    ).toEqual(['BLOCKQUOTE:Keep moving.', 'H2:Before', 'H3:Water', 'UL:OneTwo', 'OL:First']);
  });

  it('shows the next step as a link, or without one when it has no address', async () => {
    const linked = await render([], { label: 'In the directory', title: 'Book', href: '/x' });
    expect(linked.querySelector('a.story-next')?.getAttribute('href')).toBe('/x');

    const plain = await render([], { label: 'In the directory', title: 'Book', href: null });
    expect([plain.querySelector('a'), plain.querySelector('.story-next')?.textContent]).toEqual([
      null,
      'In the directoryBook',
    ]);
  });

  it('routes a plain click on a next step inside the app, and leaves other clicks to the browser', async () => {
    const fixture = TestBed.createComponent(Story);
    const emitted: string[] = [];
    fixture.componentInstance.navigate.subscribe((href) => emitted.push(href));
    fixture.componentRef.setInput('next', { label: 'In the directory', title: 'Book', href: '/x' });
    await fixture.whenStable();
    const card = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      'a.story-next',
    )!;
    const click = (init: MouseEventInit = {}) => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
      card.dispatchEvent(event);
      return event.defaultPrevented;
    };

    const plain = click();
    const modified = click({ ctrlKey: true });
    fixture.componentRef.setInput('next', {
      label: 'In the directory',
      title: 'Book',
      href: 'https://example.org/clubs',
    });
    await fixture.whenStable();
    const external = (fixture.nativeElement as HTMLElement)
      .querySelector('a.story-next')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect([plain, modified, external, emitted]).toEqual([true, false, true, ['/x']]);
  });

  // L2-061 AC5 (ADR 0109; mock story/default): the text ends with the way to send a correction.
  it('ends the text with Send a correction when given its address, routing a plain click', async () => {
    const fixture = TestBed.createComponent(Story);
    const emitted: string[] = [];
    fixture.componentInstance.navigate.subscribe((href) => emitted.push(href));
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const before = host.querySelectorAll('.story__correct').length;
    fixture.componentRef.setInput('correctionHref', '/feedback?about=story:1&kind=correction');
    await fixture.whenStable();
    const line = host.querySelector<HTMLElement>('.story__body .story__correct')!;
    const link = line.querySelector<HTMLAnchorElement>('a')!;
    const click = (init: MouseEventInit = {}) => {
      const event = new MouseEvent('click', { bubbles: true, cancelable: true, ...init });
      link.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect([
      before,
      line.textContent?.replace(/\s+/g, ' ').trim(),
      link.getAttribute('href'),
      click(),
      click({ metaKey: true }),
      emitted,
    ]).toEqual([
      0,
      'Spotted a mistake? Send a correction',
      '/feedback?about=story:1&kind=correction',
      true,
      false,
      ['/feedback?about=story:1&kind=correction'],
    ]);
  });

  // L2-061 AC3 (ADR 0105; mocks story/link-copied, story/link-refused).
  it('shows Copy link, which emits copyRequested, and reads "Link copied" with a status while copied', async () => {
    const fixture = TestBed.createComponent(Story);
    let copies = 0;
    fixture.componentInstance.copyRequested.subscribe(() => copies++);
    fixture.componentRef.setInput('copyable', true);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const button = () => host.querySelector<HTMLButtonElement>('.story__byline button')!;
    const status = () => host.querySelector('.story__byline [role="status"]')!.textContent;

    button().click();
    const before = [button().textContent?.trim(), status()];
    fixture.componentRef.setInput('copied', true);
    await fixture.whenStable();

    expect([copies, ...before, button().textContent?.trim(), status()]).toEqual([
      1,
      'Copy link',
      '',
      'Link copied',
      'Link copied',
    ]);
  });

  it('shows the address focused and selected when given one, and no Copy link unless copyable', async () => {
    const fixture = TestBed.createComponent(Story);
    document.body.appendChild(fixture.nativeElement);
    fixture.componentRef.setInput('address', 'https://www.christian.fitness/stories/rest');
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const field = host.querySelector<HTMLInputElement>('.story__address')!;

    expect([
      host.querySelector('.story__byline button'),
      field.value,
      field.readOnly,
      document.activeElement === field,
      field.selectionStart,
      field.selectionEnd,
    ]).toEqual([null, 'https://www.christian.fitness/stories/rest', true, true, 0, 42]);
    fixture.nativeElement.remove();
  });

  // L2-061 AC6 (mock story/default): Keep reading's cards, then the Weekly.
  it('shows Keep reading with each card, routes a plain click on one, and the Weekly with Subscribe', async () => {
    const fixture = TestBed.createComponent(Story);
    const emitted: string[] = [];
    fixture.componentInstance.navigate.subscribe((href) => emitted.push(href));
    const cards: StoryMoreCard[] = [
      {
        href: '/stories/walk',
        image: '/a.jpg',
        section: 'Community',
        title: '<b>Walk</b>',
        meta: 'Priya · Yesterday',
      },
      { href: '/stories/run', image: null, section: '', title: 'Run', meta: 'Yesterday' },
    ];
    fixture.componentRef.setInput('more', cards);
    fixture.componentRef.setInput('subscribeHref', '/subscribe');
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const views = [...host.querySelectorAll<HTMLAnchorElement>('.story-more .story-card')].map(
      (a) => [
        a.getAttribute('href'),
        a.querySelector('img')?.getAttribute('src') ?? null,
        a.querySelector('.story-card__section')?.textContent ?? null,
        a.querySelector('.story-card__title')?.textContent,
        a.querySelector('.story__meta')?.textContent,
      ],
    );
    host.querySelector<HTMLAnchorElement>('.story-card')!.click();
    const subscribe = host.querySelector('.story-subscribe a');

    expect([
      host.querySelector('.story-more h2')?.textContent,
      views,
      emitted,
      host.querySelector('.story-subscribe h2')?.textContent?.trim(),
      subscribe?.textContent?.trim(),
      subscribe?.getAttribute('href'),
    ]).toEqual([
      'Keep reading',
      [
        ['/stories/walk', '/a.jpg', 'Community', '<b>Walk</b>', 'Priya · Yesterday'],
        ['/stories/run', null, null, 'Run', 'Yesterday'],
      ],
      ['/stories/walk'],
      'The Abundant Weekly',
      'Subscribe free',
      '/subscribe',
    ]);
  });

  it('shows neither Keep reading with no cards nor the Weekly with no Subscribe address', async () => {
    const fixture = TestBed.createComponent(Story);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;

    expect([host.querySelector('.story-more'), host.querySelector('.story-subscribe')]).toEqual([
      null,
      null,
    ]);
  });
});
