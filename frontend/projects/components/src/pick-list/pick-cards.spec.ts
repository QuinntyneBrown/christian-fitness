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

// ADR 0088: pick cards that choose a value in a form are buttons in a labelled list.
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
