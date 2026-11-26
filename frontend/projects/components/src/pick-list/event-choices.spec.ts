import { TestBed } from '@angular/core/testing';
import { EventChoices } from './event-choices';

async function render(value: string | null, disabled = false) {
  const fixture = TestBed.createComponent(EventChoices);
  fixture.componentRef.setInput('legend', 'Event');
  fixture.componentRef.setInput('name', 'event');
  fixture.componentRef.setInput('value', value);
  fixture.componentRef.setInput('disabled', disabled);
  fixture.componentRef.setInput('items', [
    {
      id: 'e1',
      imageSrc: '/a.jpg',
      when: 'Sat Apr 18',
      title: 'Easter Sunrise 5K',
      area: 'Waterfront',
    },
    { id: 'e2', imageSrc: '/b.jpg', when: 'Tue Apr 21', title: '<b>Week 3</b>', area: 'Etobicoke' },
  ]);
  const chosen: string[] = [];
  fixture.componentInstance.chosen.subscribe((id) => chosen.push(id));
  await fixture.whenStable();
  return { root: fixture.nativeElement as HTMLElement, chosen };
}

// L2-072 AC1 (pick-list, "Event choices"): one radio group named by its legend.
describe('EventChoices', () => {
  it('lists each event as a radio in a fieldset named by its legend, the value checked', async () => {
    const { root } = await render('e2');

    expect(root.querySelector('fieldset > legend')?.textContent?.trim()).toBe('Event');
    const radios = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    expect(radios.map((r) => [r.name, r.value, r.checked])).toEqual([
      ['event', 'e1', false],
      ['event', 'e2', true],
    ]);
    const second = root.querySelectorAll('.event-choice')[1];
    expect(second.querySelector('.event-choice__title')?.textContent).toBe('<b>Week 3</b>');
    expect(second.querySelector('b')).toBeNull();
    expect(second.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('emits the id of the event chosen', async () => {
    const { root, chosen } = await render('e1');

    root.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click();

    expect(chosen).toEqual(['e2']);
  });

  it('disables every radio while disabled', async () => {
    const { root } = await render('e1', true);

    const radios = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="radio"]'));
    expect(radios.every((r) => r.disabled)).toBe(true);
  });
});
