import { booleanAttribute, Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';

/**
 * The design system's filter chip (docs/design-system/components/chip.html): a link to a filtered
 * view, inside a `cf-chip-bar`. The current filter carries `aria-current="page"` and takes the
 * inverse fill, so the state is announced and never carried by colour alone. 36 px tall, growing
 * to a 44 × 44 px target on coarse pointers; never shrinks or truncates. The label is projected.
 */
@Component({
  selector: 'cf-chip',
  templateUrl: './chip.html',
  styleUrl: './chip.scss',
})
export class Chip {
  readonly href = input.required<string>();
  readonly current = input(false, { transform: booleanAttribute });
  readonly navigate = output<string>();

  protected follow(event: MouseEvent): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.href());
  }
}
