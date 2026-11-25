import { Component, input } from '@angular/core';

/**
 * The design system's directory group (docs/design-system/components/listing-row.html, block
 * `directory-group`): one kind of listing, an `h2` with the kind's plural name and its one-line
 * blurb above the projected list of rows. Without a `heading` it is the rows alone, as when one
 * kind is chosen (L2-054 AC3).
 */
@Component({
  selector: 'cf-directory-group',
  templateUrl: './directory-group.html',
  styleUrl: './directory-group.scss',
})
export class DirectoryGroup {
  readonly heading = input<string | null>(null);
  readonly blurb = input<string | null>(null);
}
