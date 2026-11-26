import {
  booleanAttribute,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

let nextId = 0;

/**
 * The design system's dropzone (docs/design-system/components/dropzone.html): the empty place for
 * an image, a dashed 16:9 native button that opens the file picker (a hidden file input behind it)
 * and takes a file dropped on it, so keyboard and touch never need to drag (WCAG 2.5.7). Its name
 * is the title alone and the hint describes it. Busy (`aria-busy`) shows `busyLabel` and ignores
 * presses and drops while the file uploads; a file dragged over it sets `data-state="dragover"`.
 * It keeps no file: the consumer gets the picked or dropped `File` (`fileChosen`).
 */
@Component({
  selector: 'cf-dropzone',
  templateUrl: './dropzone.html',
  styleUrl: './dropzone.scss',
})
export class Dropzone {
  readonly title = input.required<string>();
  readonly hint = input('');
  /** The file types the picker offers, as the input's `accept`. */
  readonly accept = input('');
  readonly disabled = input(false, { transform: booleanAttribute });
  /** The file is on its way: announced with `aria-busy`, showing `busyLabel`. */
  readonly busy = input(false, { transform: booleanAttribute });
  readonly busyLabel = input('Uploading…');
  /** The file the person picked or dropped. */
  readonly fileChosen = output<File>();

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly id = nextId++;
  protected readonly titleId = `dropzone-title-${this.id}`;
  protected readonly hintId = `dropzone-hint-${this.id}`;
  protected readonly over = signal(false);

  protected choose(): void {
    if (this.busy()) return;
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

  protected dragOver(event: DragEvent): void {
    if (this.disabled() || this.busy()) return;
    event.preventDefault();
    this.over.set(true);
  }

  protected dropped(event: DragEvent): void {
    event.preventDefault();
    this.over.set(false);
    if (this.disabled() || this.busy()) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.fileChosen.emit(file);
  }
}
