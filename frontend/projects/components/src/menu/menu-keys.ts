/**
 * Where focus goes in a menu of `count` items when `key` is pressed on item `current`, following
 * the APG menu (docs/design-system/components/menu.html, "Keyboard"): the arrows move and wrap,
 * Home and End jump to either end. Any other key, or an empty menu, gives `null`: the menu leaves
 * it alone. Unavailable items stay in the sequence, so people learn they exist.
 */
export function nextMenuIndex(key: string, current: number, count: number): number | null {
  if (count === 0) {
    return null;
  }
  switch (key) {
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowUp':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
