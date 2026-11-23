import { TestBed } from '@angular/core/testing';
import { Menu, type MenuSection } from './menu';

const actions: readonly MenuSection[] = [
  {
    items: [
      { id: 'edit', label: 'Edit event' },
      { id: 'duplicate', label: 'Duplicate', disabled: true },
      { id: 'message', label: 'Message attendees' },
    ],
  },
  { items: [{ id: 'cancel', label: 'Cancel event', danger: true }] },
];

async function render(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(Menu);
  for (const [name, value] of Object.entries({ label: 'Actions', sections: actions, ...inputs })) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const trigger = el.querySelector('.menu__trigger') as HTMLButtonElement;
  const menu = el.querySelector('.menu') as HTMLElement;
  const items = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.menu__item'));
  const selected: string[] = [];
  fixture.componentInstance.selected.subscribe((id) => selected.push(id));
  const key = async (target: HTMLElement, name: string) => {
    const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    await fixture.whenStable();
    return event;
  };
  return { fixture, el, trigger, menu, items, selected, key };
}

describe('Menu', () => {
  it('starts closed, with a trigger that says it controls a menu labelled by it', async () => {
    const { trigger, menu } = await render();

    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('aria-labelledby')).toBe(trigger.id);
    expect(menu.hidden).toBe(true);
  });

  it('opens from the trigger and focuses the first item', async () => {
    const { fixture, trigger, menu, items } = await render();

    trigger.click();
    await fixture.whenStable();

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(menu.hidden).toBe(false);
    expect(document.activeElement).toBe(items()[0]);
  });

  it.each<[string, number]>([
    ['ArrowDown', 0],
    ['ArrowUp', 3],
  ])('opens with %s on the trigger and focuses item %i', async (name, index) => {
    const { trigger, items, key } = await render();

    const event = await key(trigger, name);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(items()[index]);
  });

  it('moves focus with the arrow keys, Home and End, keeping one item in the tab order', async () => {
    const { fixture, trigger, items, key } = await render();
    trigger.click();
    await fixture.whenStable();

    await key(items()[0], 'ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    expect(items().map((item) => item.tabIndex)).toEqual([-1, 0, -1, -1]);

    await key(items()[1], 'End');
    expect(document.activeElement).toBe(items()[3]);
    await key(items()[3], 'ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
    await key(items()[0], 'ArrowUp');
    expect(document.activeElement).toBe(items()[3]);
    await key(items()[3], 'Home');
    expect(document.activeElement).toBe(items()[0]);
  });

  it.each(['Enter', ' '])(
    'activates the focused item with "%s", closes and returns focus to the trigger',
    async (name) => {
      const { fixture, trigger, menu, items, selected, key } = await render();
      trigger.click();
      await fixture.whenStable();

      await key(items()[0], 'ArrowDown');
      await key(items()[1], 'ArrowDown');
      await key(items()[2], name);

      expect(selected).toEqual(['message']);
      expect(menu.hidden).toBe(true);
      expect(document.activeElement).toBe(trigger);
    },
  );

  it('activates an item by click', async () => {
    const { fixture, trigger, items, selected } = await render();
    trigger.click();
    await fixture.whenStable();

    items()[3].click();

    expect(selected).toEqual(['cancel']);
  });

  it('keeps an unavailable item focusable, says so, and does nothing when it is activated', async () => {
    const { fixture, trigger, menu, items, selected, key } = await render();
    trigger.click();
    await fixture.whenStable();

    await key(items()[0], 'ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    expect(items()[1].getAttribute('aria-disabled')).toBe('true');
    await key(items()[1], 'Enter');
    items()[1].click();

    expect(selected).toEqual([]);
    expect(menu.hidden).toBe(false);
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    const { fixture, trigger, menu, items, key } = await render();
    trigger.click();
    await fixture.whenStable();

    await key(items()[0], 'Escape');

    expect(menu.hidden).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes with Tab and lets focus move on', async () => {
    const { fixture, trigger, menu, items, key } = await render();
    trigger.click();
    await fixture.whenStable();

    const event = await key(items()[0], 'Tab');

    expect(event.defaultPrevented).toBe(false);
    expect(menu.hidden).toBe(true);
  });

  it('closes when the person taps outside it', async () => {
    const { fixture, trigger, menu } = await render();
    trigger.click();
    await fixture.whenStable();

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await fixture.whenStable();

    expect(menu.hidden).toBe(true);
  });

  it('as a choice menu, marks the chosen option with aria-checked on menuitemradio', async () => {
    const { items } = await render({
      kind: 'choice',
      sections: [
        {
          heading: 'Sort by',
          items: [
            { id: 'soonest', label: 'Soonest first', checked: true },
            { id: 'newest', label: 'Newest added' },
          ],
        },
      ],
    });

    expect(items().map((item) => item.getAttribute('role'))).toEqual([
      'menuitemradio',
      'menuitemradio',
    ]);
    expect(items().map((item) => item.getAttribute('aria-checked'))).toEqual(['true', 'false']);
  });

  it('names an icon-only trigger after the object it acts on', async () => {
    const { trigger } = await render({ iconOnly: true, label: 'Actions for Saturday run' });

    expect(trigger.getAttribute('aria-label')).toBe('Actions for Saturday run');
  });
});
