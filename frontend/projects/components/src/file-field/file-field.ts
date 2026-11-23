import { booleanAttribute, Component, ElementRef, inject, input, output } from '@angular/core';
import { Button } from '../button/button';
import { fieldDescribedBy } from '../form-field/form-field';

let nextId = 0;

/**
 * The design system's file field (docs/design-system/components/file-field.html): a native file
 * input, hidden, beside a "Choose image" button that opens the picker, the chosen file's name (or
 * "No image chosen") and, once there is one, Remove. The label, the "(optional)" marker, the hint
 * and the error are the other fields'; the group is named by its label, and the button is tied to
 * the error or hint it is described by. It keeps no file: the consumer owns what is chosen and
 * shows its name, and gets the picked `File` to upload (`fileChosen`) or a `removed`. Choosing the
 * same file again works, since the input is cleared once the file is handed over. Every text is
 * rendered as text.
 */
@Component({
  selector: 'cf-file-field',
  imports: [Button],
  templateUrl: './file-field.html',
  styleUrl: './file-field.scss',
})
export class FileField {
  /** The "Choose image" button's id, which the error summary's link focuses. */
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly name = input.required<string>();
  /** The file types the picker offers, as the input's `accept`. */
  readonly accept = input('');
  /** The picker button's label. */
  readonly chooseLabel = input('Choose image');
  /** What Remove names for screen readers: "Remove image". */
  readonly noun = input('image');
  /** What the field says when no file is chosen. */
  readonly emptyText = input('No image chosen');
  /** The chosen file's name; none when there is none. */
  readonly fileName = input<string | null>(null);
  readonly optional = input(false, { transform: booleanAttribute });
  readonly hint = input<string | null>();
  /** What is wrong with the file; none when it is fine. */
  readonly error = input<string | null>();
  readonly disabled = input(false, { transform: booleanAttribute });

  /** The file the person picked. */
  readonly fileChosen = output<File>();
  /** Remove was chosen. */
  readonly removed = output<void>();

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  protected readonly labelId = `file-field-label-${nextId++}`;

  protected describedBy(): string | null {
    return fieldDescribedBy(this.fieldId(), this.hint(), this.error());
  }

  protected choose(): void {
    // A DOM lookup, not a view query (queries add to the initial bundle, slice 30.1).
    this.host.nativeElement.querySelector<HTMLInputElement>('input[type=file]')?.click();
  }

  protected picked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Cleared so that choosing the same file again is a change.
    input.value = '';
    if (file) this.fileChosen.emit(file);
  }
}
