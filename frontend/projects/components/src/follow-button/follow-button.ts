import { booleanAttribute, Component, input, output } from '@angular/core';

/**
 * The design system's follow button (docs/design-system/components/follow-button.html, block
 * `follow`): a toggle with `aria-pressed` whose label is always "Follow"; pressed, it is tinted and
 * shows a check mark, so the state never rests on colour (L2-056 AC1). The listing's `name`
 * completes its accessible name in visually hidden text. `large` is the profile head's size
 * (`follow--lg`). While `busy` (its request in flight) it carries `aria-disabled="true"` and a press
 * emits nothing (L2-056 AC8); otherwise a press emits `toggled`. Under a coarse pointer its target
 * extends to 44 × 44 px (L2-054 AC9). The name is rendered as text.
 */
@Component({
  selector: 'cf-follow-button',
  templateUrl: './follow-button.html',
  styleUrl: './follow-button.scss',
})
export class FollowButton {
  readonly following = input(false, { transform: booleanAttribute });
  readonly name = input('');
  readonly large = input(false, { transform: booleanAttribute });
  readonly busy = input(false, { transform: booleanAttribute });
  readonly toggled = output<void>();

  protected press(): void {
    if (!this.busy()) this.toggled.emit();
  }
}
