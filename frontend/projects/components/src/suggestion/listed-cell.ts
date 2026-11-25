import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { ListingMark } from '../listing-row/listing-mark';
import { VerifiedMark } from '../listing-row/verified-mark';

/** A name or kind the owner asked for, as the change line says it (ADR 0095). */
export interface ListedCellChange {
  what: 'name' | 'kind';
  /** "New name waiting:" or "New kind waiting:". */
  label: string;
  /** The waiting name, or the waiting kind's label. */
  value: string;
}

/**
 * The design system's listed cell (docs/design-system/components/suggestion.html, "Listed cell",
 * block `listed-cell`): in the Listed table, a listing's small mark, its name and, when it is
 * verified, the Verified mark, on one line. With a `change` (variant `listed-cell--change`) a line
 * under them says the name or kind the owner asked for, with Approve and Decline, each named for
 * the listing; `busy` holds both while a decision is on its way. Every word is rendered as text.
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
  readonly change = input<ListedCellChange | null>(null);
  readonly busy = input(false, { transform: booleanAttribute });
  readonly approve = output<void>();
  readonly decline = output<void>();

  protected readonly classes = computed(() =>
    this.change() === null ? 'listed-cell' : 'listed-cell listed-cell--change',
  );
}
