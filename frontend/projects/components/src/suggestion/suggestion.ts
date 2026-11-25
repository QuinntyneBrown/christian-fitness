import { booleanAttribute, Component, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Card } from '../card/card';

/** One check row: its value, its name, the standard it stands for and whether it passed. */
export interface CheckRowItem {
  check: string;
  label: string;
  standard: string;
  passed: boolean;
}

/** A tick or untick of one check. */
export interface CheckRowChange {
  check: string;
  passed: boolean;
}

let nextId = 0;

/**
 * The design system's suggestion (docs/design-system/components/suggestion.html): a surface card
 * holding a native form with the kind, name, area and website (opening in a new tab and saying
 * so), the member's words as a quotation, who sent it, the "Checks" fieldset of check rows with
 * "<n> of 4 passed", and the decision row. Approve listing is disabled until `canApprove`, joined
 * to the hint that says why; once decided, `result` replaces the decision row as a status and the
 * checks are read-only. Every text is rendered as text. It emits `checkChange` for a tick or untick,
 * `approve` and `decline`; the screen decides what follows.
 */
@Component({
  selector: 'cf-suggestion',
  imports: [Button, Card],
  templateUrl: './suggestion.html',
  styleUrl: './suggestion.scss',
})
export class Suggestion {
  /** The kind by its singular name: "Instructor". */
  readonly kind = input.required<string>();
  readonly name = input.required<string>();
  readonly area = input.required<string>();
  /** The website's address, opened in a new tab; none when not given. */
  readonly website = input<string | null>(null);
  /** How the website is named: "delaneyperformance.ca". */
  readonly websiteLabel = input<string>('');
  /** What the member wrote; none when they wrote nothing. */
  readonly note = input<string | null>(null);
  /** Who sent it and how they know them. */
  readonly by = input.required<string>();
  readonly checks = input.required<readonly CheckRowItem[]>();
  /** "3 of 4 passed". */
  readonly passed = input.required<string>();
  /** The checks cannot change: the suggestion is decided or a decision is on its way. */
  readonly locked = input(false, { transform: booleanAttribute });
  /** All four checks passed. */
  readonly canApprove = input(false, { transform: booleanAttribute });
  readonly approving = input(false, { transform: booleanAttribute });
  /** Why Approve listing is unavailable. */
  readonly hint = input<string>('');
  /** What the decision did, once decided: "Approved. We've sent them …". */
  readonly result = input<string | null>(null);
  /** Offers Send a new link under the result (ADR 0091). */
  readonly resendable = input(false, { transform: booleanAttribute });
  /** A new link is on its way: the button reads "Sending…" and waits. */
  readonly resending = input(false, { transform: booleanAttribute });

  readonly checkChange = output<CheckRowChange>();
  readonly approve = output<void>();
  readonly decline = output<void>();
  readonly resend = output<void>();

  protected readonly hintId = `suggestion-hint-${++nextId}`;

  protected tick(check: string, event: Event): void {
    this.checkChange.emit({ check, passed: (event.target as HTMLInputElement).checked });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (this.canApprove() && !this.approving() && !this.result()) this.approve.emit();
  }
}
