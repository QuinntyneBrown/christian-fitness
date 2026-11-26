import { TestBed } from '@angular/core/testing';
import { IssueView, type IssueViewModel } from './issue-view';

const ISSUE: IssueViewModel = {
  name: 'The Abundant Weekly',
  date: 'No. 48 · Saturday, April 11, 2026',
  greeting: 'Morning, Grace.',
  editorsNote: 'Spring finally showed <b>up</b>.',
  lead: {
    section: 'The big story · Community',
    title: 'A West End church turned its basement into a free gym',
    summary: 'Rowers, kettlebells and a Thursday prayer circle.',
    image: '/api/stories/images/a.jpg',
    href: '/stories/basement-gym',
  },
  events: [
    {
      id: 'e1',
      month: 'Apr',
      day: '18',
      title: 'Easter Sunrise 5K',
      meta: 'Sat 6:45 AM · Waterfront · Free',
    },
  ],
  briefs: [
    {
      href: '/stories/meal-prep',
      section: 'Nutrition',
      title: 'Inside the Scarborough kitchen',
      summary: null,
      author: 'Priya Raman',
      age: '',
      image: null,
    },
  ],
  verse: 'Do you not know that your bodies are temples of the Holy Spirit?',
  verseReference: '1 Corinthians 6:19',
};

async function render(issue: IssueViewModel = ISSUE) {
  const fixture = TestBed.createComponent(IssueView);
  fixture.componentRef.setInput('issue', issue);
  const navigated: string[] = [];
  fixture.componentInstance.navigate.subscribe((href) => navigated.push(href));
  await fixture.whenStable();
  return { root: fixture.nativeElement as HTMLElement, navigated };
}

const text = (root: Element, selector: string) =>
  root.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim();

// L2-059 AC1, AC3, AC6 (issue.html): one article, one h1, the sections in order, the footer's links.
describe('IssueView', () => {
  it('is one article with one h1, h2 for each section and h3 for each brief, every value as text', async () => {
    const { root } = await render();

    expect(root.querySelectorAll('article')).toHaveLength(1);
    expect(
      Array.from(root.querySelectorAll('h1, h2, h3')).map((h) => [
        h.tagName,
        h.textContent?.trim(),
      ]),
    ).toEqual([
      ['H1', 'The Abundant Weekly'],
      ['H2', 'A West End church turned its basement into a free gym'],
      ['H2', 'On the calendar'],
      ['H2', 'Worth your time'],
      ['H3', 'Inside the Scarborough kitchen'],
    ]);
    expect(text(root, '.issue__date')).toBe('No. 48 · Saturday, April 11, 2026');
    expect(text(root, '.issue__greeting')).toBe('Morning, Grace.');
    expect(text(root, '.issue__text')).toBe('Spring finally showed <b>up</b>.');
    expect(root.querySelector('.issue__text b')).toBeNull();
    expect(text(root, '.story__section')).toBe('The big story · Community');
    expect(root.querySelector('.issue__image')?.getAttribute('alt')).toBe('');
    expect(text(root, '.event-row__title')).toBe('Easter Sunrise 5K');
    expect(text(root, '.event-row__meta')).toBe('Sat 6:45 AM · Waterfront · Free');
    expect(root.querySelector('a.event-row')).toBeNull();
    expect(text(root, '.story__meta')).toBe('Priya Raman');
    expect(text(root, '.issue__quote')).toBe(
      '“Do you not know that your bodies are temples of the Holy Spirit?”',
    );
    expect(text(root, '.issue__cite')).toBe('1 Corinthians 6:19');
  });

  it('leads every footer link to Subscribe, so the web version unsubscribes nobody', async () => {
    const { root } = await render();

    expect(
      Array.from(root.querySelectorAll('.issue__links a')).map((a) => [
        a.textContent?.trim(),
        a.getAttribute('href'),
      ]),
    ).toEqual([
      ['Manage preferences', '/subscribe'],
      ['Follow by RSS', '/subscribe#rss'],
      ['Unsubscribe', '/subscribe'],
    ]);
  });

  it('leaves out the greeting, the big story, the calendar, the briefs and the verse when it has none', async () => {
    const { root } = await render({
      ...ISSUE,
      greeting: null,
      lead: null,
      events: [],
      briefs: [],
      verse: '',
    });

    expect(root.querySelector('.issue__greeting')).toBeNull();
    expect(root.querySelectorAll('h2')).toHaveLength(0);
    expect(root.querySelector('.issue__verse')).toBeNull();
    expect(root.querySelectorAll('h1')).toHaveLength(1);
  });

  it('emits navigate for a plain click on Read the story, a brief and a footer link', async () => {
    const { root, navigated } = await render();

    root.querySelector<HTMLElement>('.issue__action a')!.click();
    root.querySelector<HTMLElement>('.headline__title a')!.click();
    root.querySelectorAll<HTMLElement>('.issue__links a')[1].click();

    expect(navigated).toEqual(['/stories/basement-gym', '/stories/meal-prep', '/subscribe#rss']);
  });
});
