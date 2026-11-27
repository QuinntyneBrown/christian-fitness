import { booleanAttribute, Component, input, output } from '@angular/core';

/** One row of a pick list: what it is, a muted line under it, and whether it is ticked or unavailable. */
export interface PickRowItem {
  id: string;
  title: string;
  /** "Faith & Body · 11 hours ago". */
  meta: string;
  checked: boolean;
  /** Unavailable: the limit is reached and this row is not ticked. */
  disabled: boolean;
}

/** A row ticked or unticked. */
export interface PickRowToggle {
  id: string;
  checked: boolean;
}

/**
 * The design system's pick list (docs/design-system/components/pick-list.html, blocks `pick-list`
 * and `pick-row`): several of a few with native checkboxes in a `fieldset` named by its legend,
 * which carries the count ("3 of 3"). A row at the limit is disabled, in words through the count
 * and to assistive technology through the attribute. `disabled` locks every row. Titles and meta
 * are rendered as text.
 */
@Component({
  selector: 'cf-pick-rows',
  templateUrl: './pick-rows.html',
  styleUrl: './pick-rows.scss',
})
export class PickRows {
  readonly legend = input.required<string>();
  /** "3 of 3", shown muted after the legend. */
  readonly count = input<string>();
  readonly name = input.required<string>();
  readonly items = input.required<readonly PickRowItem[]>();
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly toggled = output<PickRowToggle>();

  protected onChange(id: string, event: Event): void {
    this.toggled.emit({ id, checked: (event.target as HTMLInputElement).checked });
  }
}
