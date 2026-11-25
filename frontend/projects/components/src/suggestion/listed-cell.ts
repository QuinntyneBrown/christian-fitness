import { booleanAttribute, Component, input } from '@angular/core';
import { ListingMark } from '../listing-row/listing-mark';
import { VerifiedMark } from '../listing-row/verified-mark';

/**
 * The design system's listed cell (docs/design-system/components/suggestion.html, "Listed cell",
 * block `listed-cell`): in the Listed table, a listing's small mark, its name and, when it is
 * verified, the Verified mark, on one line. The name is rendered as text.
 */
@Component({
  selector: 'cf-listed-cell',
  imports: [ListingMark, VerifiedMark],
  templateUrl: './listed-cell.html',
  styleUrl: './listed-cell.scss',
})
export class ListedCell {
  readonly name = input.required<string>();
  readonly initials = input('');
  readonly photoSrc = input<string | null>(null);
  readonly person = input(false, { transform: booleanAttribute });
  readonly verified = input(false, { transform: booleanAttribute });
}
