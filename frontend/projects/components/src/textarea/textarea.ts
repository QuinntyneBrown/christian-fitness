import {
  booleanAttribute,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  output,
  signal,
} from '@angular/core';
import { fieldDescribedBy, FormField } from '../form-field/form-field';
import { characterCount } from './character-count';

/** How long typing must pause before the counter is announced. */
export const COUNTER_ANNOUNCE_DELAY_MS = 1000;

/**
 * The design system's textarea (docs/design-system/components/textarea.html): multi-line text in
 * a form field, `rows` tall (4 by default), with no resize handle. Enter inserts a new line and Tab
 * is never captured. With `maxLength`, the hint carries the characters left ("A sentence or two.
 * 106 characters left."); past the limit the counter becomes the field's error ("12 characters
 * over") and nothing is truncated, so no `maxlength` attribute is set (unless a hard `limit` asks
 * for one). The count is announced in a
 * separate polite live region once typing pauses, not on every key; the pending announcement is
 * dropped when the field is destroyed. Every text is rendered as text.
 */
@Component({
  selector: 'cf-textarea',
  imports: [FormField],
  templateUrl: './textarea.html',
  styleUrl: './textarea.scss',
})
export class Textarea {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly name = input.required<string>();
  /** The starting height: 3 for bios and messages, 4 by default, 6 for event descriptions. */
  readonly rows = input(4, { transform: numberAttribute });
  /** The counter's limit; none for no counter. */
  readonly maxLength = input<number>();
  /**
   * A hard limit the field never goes past (the native `maxlength`), for text that must fit
   * somewhere fixed, such as a Community Pick note on its graphics (ADR 0098); none by default.
   */
  readonly limit = input<number>();
  readonly optional = input(false, { transform: booleanAttribute });
  readonly hint = input<string>();
  readonly value = input('');
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** What is wrong with the value; none when it is fine. */
  readonly error = input<string | null>();

  readonly valueChange = output<string>();

  /** What is in the field now: the consumer's value until people type. */
  private readonly text = linkedSignal(() => this.value());

  private readonly count = computed(() => {
    const max = this.maxLength();
    return max === undefined ? null : characterCount(this.text().length, max);
  });

  protected readonly shownHint = computed(() => {
    const count = this.count();
    if (count?.kind !== 'left') return this.hint();
    return this.hint() ? `${this.hint()} ${count.text}` : count.text;
  });

  protected readonly shownError = computed(() => {
    const count = this.count();
    return this.error() || (count?.kind === 'over' ? count.text : null);
  });

  protected readonly describedBy = computed(() =>
    fieldDescribedBy(this.fieldId(), this.shownHint(), this.shownError()),
  );

  /** The polite live region's words, set once typing pauses. */
  protected readonly announcement = signal('');

  private pending: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.pending));
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.text.set(value);
    this.valueChange.emit(value);
    if (this.maxLength() === undefined) return;
    clearTimeout(this.pending);
    this.pending = setTimeout(() => {
      this.pending = undefined;
      this.announcement.set(this.count()?.text ?? '');
    }, COUNTER_ANNOUNCE_DELAY_MS);
  }
}
