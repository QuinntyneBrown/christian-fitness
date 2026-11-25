import { booleanAttribute, Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';

/** One view the control links to: its words, address, whether it is shown, and an optional icon. */
export interface SegmentedOption {
  label: string;
  href: string;
  current: boolean;
  /** The decorative repeat icon before the label, as "Series" carries (`segmented-control`). */
  icon?: 'repeat';
}

/**
 * The design system's segmented control (docs/design-system/components/segmented-control.html,
 * block `segmented`): a `nav` named by `label` ("View") holding two to four links, each a view of
 * the same thing, the current one with `aria-current="page"` and the accent fill, so the state is
 * announced and carried by shape as well as colour. Each view is its own address, so this is
 * navigation, not tabs: Tab moves between options and Enter opens one. A plain click emits
 * `navigate` for the app's router; a modified click is left to the browser. `flush` drops the top
 * margin and scrolls sideways inside its container; `ink` fills the current option near-black, for
 * the admin console. On coarse pointers each option's target grows to 44 × 44 px. Words are text.
 */
@Component({
  selector: 'cf-segmented-control',
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.scss',
})
export class SegmentedControl {
  readonly label = input.required<string>();
  readonly options = input.required<readonly SegmentedOption[]>();
  readonly flush = input(false, { transform: booleanAttribute });
  readonly ink = input(false, { transform: booleanAttribute });
  readonly navigate = output<string>();

  /** The track's classes, composed here: a `[class.x]` binding would grow every app's initial bundle. */
  protected trackClass(): string {
    return this.flush() ? 'segmented segmented--flush' : 'segmented';
  }

  protected optionClass(): string {
    return this.ink() ? 'segmented__option segmented__option--ink' : 'segmented__option';
  }

  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
