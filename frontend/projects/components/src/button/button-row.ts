import { Component, input } from '@angular/core';

/** How a button row lays out its buttons. */
export type ButtonRowLayout = 'row' | 'stack' | 'grid';

/**
 * The design system's button groupings (docs/design-system/components/button.html): `btn-row`
 * side by side, `btn-row--stack` stacked below 640 px and in a row above, or `btn-grid` in two
 * equal columns. Buttons are projected; give them `grow` to share a row equally.
 */
@Component({
  selector: 'cf-button-row',
  templateUrl: './button-row.html',
  styleUrl: './button-row.scss',
})
export class ButtonRow {
  readonly layout = input<ButtonRowLayout>('row');

  protected classes(): string {
    const layout = this.layout();
    if (layout === 'grid') return 'btn-grid';
    return layout === 'stack' ? 'btn-row btn-row--stack' : 'btn-row';
  }
}
