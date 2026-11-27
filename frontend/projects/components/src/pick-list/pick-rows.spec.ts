import { TestBed } from '@angular/core/testing';
import { PickRows, type PickRowToggle } from './pick-rows';

async function render(disabled = false) {
  const fixture = TestBed.createComponent(PickRows);
  fixture.componentRef.setInput('legend', 'Also this week');
  fixture.componentRef.setInput('count', '1 of 3');
  fixture.componentRef.setInput('name', 'also');
  fixture.componentRef.setInput('disabled', disabled);
  fixture.componentRef.setInput('items', [
    {
      id: 's1',
      title: 'Rest day',
      meta: 'Faith & Body · 11 hours ago',
      checked: true,
      disabled: false,
    },
    { id: 's2', title: '<b>Half</b>', meta: 'Events · Yesterday', checked: false, disabled: true },
    {
      id: 's3',
      title: 'Walking group',
      meta: 'Community · Yesterday',
      checked: false,
      disabled: false,
    },
  ]);
  const toggled: PickRowToggle[] = [];
  fixture.componentInstance.toggled.subscribe((t) => toggled.push(t));
  await fixture.whenStable();
  return { root: fixture.nativeElement as HTMLElement, toggled };
}

// L2-070 AC2 (pick-list, "Builder with a pick list"): checkboxes in a fieldset whose legend counts.
describe('PickRows', () => {
  it('lists each row as a checkbox in a fieldset whose legend carries the count', async () => {
    const { root } = await render();

    expect(root.querySelector('fieldset > legend')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Also this week · 1 of 3',
    );
    const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
    expect(boxes.map((b) => [b.name, b.value, b.checked, b.disabled])).toEqual([
      ['also', 's1', true, false],
      ['also', 's2', false, true],
      ['also', 's3', false, false],
    ]);
    const second = root.querySelectorAll('.pick-row')[1];
    expect(second.querySelector('.pick-row__title')?.textContent).toBe('<b>Half</b>');
    expect(second.querySelector('b')).toBeNull();
    expect(second.querySelector('.pick-row__meta')?.textContent).toBe('Events · Yesterday');
  });

  it('emits the row ticked or unticked', async () => {
    const { root, toggled } = await render();

    root.querySelectorAll<HTMLInputElement>('input')[2].click();
    root.querySelectorAll<HTMLInputElement>('input')[0].click();

    expect(toggled).toEqual([
      { id: 's3', checked: true },
      { id: 's1', checked: false },
    ]);
  });

  it('locks every row when disabled', async () => {
    const { root } = await render(true);

    const boxes = Array.from(root.querySelectorAll<HTMLInputElement>('input'));
    expect(boxes.every((b) => b.disabled)).toBe(true);
  });
});
