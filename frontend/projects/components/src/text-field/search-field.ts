import { booleanAttribute, Component, input, output } from '@angular/core';

/**
 * The design system's search pill (docs/design-system/components/text-field.html, "Search"): a
 * `search` label holding the leading icon, the visually hidden `label` that names the field and a
 * `search__input` of type `search`. Full width on phones, a fixed width from 640 px. The value is
 * the consumer's: `valueChange` reports each edit, and Escape clears a query that is not empty.
 */
@Component({
  selector: 'cf-search-field',
  templateUrl: './search-field.html',
  styleUrl: './search-field.scss',
})
export class SearchField {
  /** Names the field for assistive technology; never shown, never a placeholder's job. */
  readonly label = input.required<string>();
  readonly placeholder = input<string>();
  readonly name = input<string>('q');
  readonly value = input('');
  /** The wider pill from 640 px (`search--wide`), as the directory's. */
  readonly wide = input(false, { transform: booleanAttribute });
  /** The most characters the field takes, or no limit. */
  readonly maxLength = input<number | null>(null);

  readonly valueChange = output<string>();

  protected onInput(event: Event): void {
    this.valueChange.emit((event.target as HTMLInputElement).value);
  }

  /** Escape clears the query. */
  protected onEscape(event: Event): void {
    const field = event.target as HTMLInputElement;
    if (!field.value) return;
    event.preventDefault();
    field.value = '';
    this.valueChange.emit('');
  }
}
