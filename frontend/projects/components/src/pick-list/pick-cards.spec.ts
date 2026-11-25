import { TestBed } from '@angular/core/testing';
import { PickCards } from './pick-cards';

async function render(stack: boolean) {
  const fixture = TestBed.createComponent(PickCards);
  fixture.componentRef.setInput('label', 'Matching hosts');
  fixture.componentRef.setInput('stack', stack);
  fixture.componentRef.setInput('items', [
    { id: 'h1', title: '<b>Lakeshore</b> Runners', meta: 'Organization · Listed' },
    { id: 'h2', title: 'Danielle Okafor', meta: 'Instructor · Listed' },
  ]);
  const picked: string[] = [];
  fixture.componentInstance.picked.subscribe((id) => picked.push(id));
  await fixture.whenStable();
  return { root: fixture.nativeElement as HTMLElement, picked };
}

// ADR 0089: pick cards that choose a value in a form are buttons in a labelled list.
describe('PickCards', () => {
  it('lists each card as a button in a list named by its label, text as text', async () => {
    const { root } = await render(true);
    const list = root.querySelector('ul');

    expect(list?.getAttribute('aria-label')).toBe('Matching hosts');
    expect(list?.getAttribute('class')).toBe('pick-cards pick-cards--stack');
    const buttons = Array.from(root.querySelectorAll('button.pick-card'));
    expect(buttons.map((b) => b.getAttribute('type'))).toEqual(['button', 'button']);
    expect(buttons[0].querySelector('.pick-card__title')?.textContent).toBe(
      '<b>Lakeshore</b> Runners',
    );
    expect(buttons[0].querySelector('b')).toBeNull();
    expect(buttons[1].querySelector('.pick-card__meta')?.textContent).toBe('Instructor · Listed');
  });

  it('scrolls sideways unless stacked', async () => {
    const { root } = await render(false);

    expect(root.querySelector('ul')?.getAttribute('class')).toBe('pick-cards');
  });

  it('emits the id of the card chosen', async () => {
    const { root, picked } = await render(true);

    root.querySelectorAll<HTMLButtonElement>('button.pick-card')[1].click();

    expect(picked).toEqual(['h2']);
  });
});

async function renderLinks() {
  const fixture = TestBed.createComponent(PickCards);
  fixture.componentRef.setInput('label', 'Suggestions');
  fixture.componentRef.setInput('light', true);
  fixture.componentRef.setInput('current', 's2');
  fixture.componentRef.setInput('items', [
    {
      id: 's1',
      title: 'Rooted Physio',
      meta: ['Physio · Leslieville', '2 days ago'],
      href: '/listings?selected=s1',
    },
    {
      id: 's2',
      title: 'Coach',
      meta: ['Instructor · Etobicoke'],
      href: '/listings?selected=s2',
      tag: 'Approved',
    },
  ]);
  const picked: string[] = [];
  fixture.componentInstance.picked.subscribe((id) => picked.push(id));
  await fixture.whenStable();
  return { root: fixture.nativeElement as HTMLElement, picked };
}

// ADR 0090: pick cards that choose the record a page shows are links in a labelled nav.
describe('PickCards as links', () => {
  it('lists each card as a link in a nav named by its label, the current one marked', async () => {
    const { root } = await renderLinks();

    expect(root.querySelector('nav')?.getAttribute('aria-label')).toBe('Suggestions');
    expect(root.querySelector('ul')?.hasAttribute('aria-label')).toBe(false);
    const links = Array.from(root.querySelectorAll('a.pick-card'));
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/listings?selected=s1',
      '/listings?selected=s2',
    ]);
    expect(links.map((a) => a.getAttribute('aria-current'))).toEqual([null, 'page']);
    expect(links[0].getAttribute('class')).toBe('pick-card pick-card--light');
    expect(Array.from(links[0].querySelectorAll('.pick-card__meta'), (m) => m.textContent)).toEqual(
      ['Physio · Leslieville', '2 days ago'],
    );
    expect(links[1].querySelector('.pick-card__tag')?.textContent).toBe('Approved');
    expect(root.querySelector('button')).toBeNull();
  });

  it('emits the id of a card followed by a plain click and stays put', async () => {
    const { root, picked } = await renderLinks();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

    root.querySelectorAll('a.pick-card')[0].dispatchEvent(click);

    expect(picked).toEqual(['s1']);
    expect(click.defaultPrevented).toBe(true);
  });

  it('leaves a modified click to the browser', async () => {
    const { root, picked } = await renderLinks();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });

    root.querySelectorAll('a.pick-card')[0].dispatchEvent(click);

    expect(picked).toEqual([]);
    expect(click.defaultPrevented).toBe(false);
  });
});
