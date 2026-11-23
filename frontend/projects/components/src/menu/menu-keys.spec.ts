import { nextMenuIndex } from './menu-keys';

describe('nextMenuIndex', () => {
  // The APG menu's keys (menu.html, "Keyboard"), one row per case, on a menu of four items.
  it.each<[string, number, number | null, string]>([
    ['ArrowDown', 0, 1, 'moves to the next item'],
    ['ArrowDown', 3, 0, 'wraps from the last item to the first'],
    ['ArrowUp', 2, 1, 'moves to the previous item'],
    ['ArrowUp', 0, 3, 'wraps from the first item to the last'],
    ['Home', 2, 0, 'goes to the first item'],
    ['End', 1, 3, 'goes to the last item'],
    ['a', 1, null, 'leaves any other key alone'],
    ['Tab', 1, null, 'leaves Tab to close the menu'],
  ])('%s from item %i gives %s: %s', (key, current, expected) => {
    expect(nextMenuIndex(key, current, 4)).toBe(expected);
  });

  it('has nowhere to go in an empty menu', () => {
    expect(nextMenuIndex('ArrowDown', 0, 0)).toBeNull();
  });
});
