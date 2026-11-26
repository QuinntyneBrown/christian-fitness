import { signal } from '@angular/core';

/** How long "Link copied" holds after a press (L2-061 AC3). */
export const COPIED_MS = 2_000;

/**
 * Whether a link was just copied (L2-061 AC3; ADR 0105): `raise()` sets `copied` for
 * {@link COPIED_MS}, a second press starting the time again; `dispose()` clears the timer, and the
 * page that owns the flag calls it when it is destroyed.
 */
export class CopiedFlag {
  private readonly raised = signal(false);
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly copied = this.raised.asReadonly();

  raise(): void {
    clearTimeout(this.timer);
    this.raised.set(true);
    this.timer = setTimeout(() => this.raised.set(false), COPIED_MS);
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.raised.set(false);
  }
}
