import { TestBed } from '@angular/core/testing';
import type { StoryBlock, StoryRun } from '@cf/api';
import { Story, type StoryNextCard } from './story';

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
});
