import { booleanAttribute, Component, input, output } from '@angular/core';

/**
 * The design system's interest toggle (docs/design-system/components/chip.html, "Interest
 * toggles"): a `<button type="button">` with `aria-pressed`, several of which can be on. Pressed
 * fills bordeaux, backed by the attribute. The value is the consumer's: `pressed` sets it and a
 * press reports the other state through `pressedChange`. Disabled together while a dialog saves.
 * The label is projected.
 */
@Component({
  selector: 'cf-interest',
  templateUrl: './interest.html',
  styleUrl: './interest.scss',
})
export class Interest {
  readonly pressed = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly pressedChange = output<boolean>();

  protected toggle(): void {
    this.pressedChange.emit(!this.pressed());
  }
}
