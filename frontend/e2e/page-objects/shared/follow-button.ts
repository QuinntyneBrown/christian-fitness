import type { Locator } from '@playwright/test';

/** A Follow button as the member reads it (L2-056 AC1), on a directory row or a profile head. */
export interface FollowButtonView {
  /** The visible label. */
  label: string;
  /** Its accessible name, with the listing's name. */
  name: string;
  pressed: string | null;
  /** Whether the check mark shows. */
  check: boolean;
  /** `aria-disabled`, set while its request is in flight (L2-056 AC8). */
  disabled: string | null;
}

/** Reads a Follow button: its label, accessible name, pressed state, check mark and `aria-disabled`. */
export async function readFollow(button: Locator): Promise<FollowButtonView> {
  return button.evaluate((element) => ({
    label: Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join('')
      .trim(),
    name: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
    pressed: element.getAttribute('aria-pressed'),
    check: element.querySelector('svg.icon') !== null,
    disabled: element.getAttribute('aria-disabled'),
  }));
}
