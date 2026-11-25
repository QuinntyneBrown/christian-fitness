import { booleanAttribute, Component, computed, input, model, output } from '@angular/core';

let nextId = 0;

/**
 * The design system's composer (docs/design-system/components/message.html, "Composer"): a pill
 * field with a visually hidden label and a round 44 px Send named "Send", pinned at the foot of a
 * thread. Send is enabled only with text to send; Enter in the field or Send submits, emits `send`
 * with the trimmed text and empties the field. The `draft` is two-way, so a screen can keep it
 * when the person leaves.
 *
 * `locked` is its note state (`composer--note`, ADR 0065): the field and Send give way to the
 * projected note, such as "This account doesn't read replies" with its link. `refusal` shows a
 * send the server refused above it, as an alert; both are rendered as text.
 */
@Component({
  selector: 'cf-composer',
  templateUrl: './composer.html',
  styleUrl: './composer.scss',
})
export class Composer {
  /** The field's label and placeholder, such as "Message Sunrise 5K Crew". */
  readonly label = input.required<string>();
  readonly draft = model('');
  /** No message can be sent: the projected note replaces the field and Send. */
  readonly locked = input(false, { transform: booleanAttribute });
  /** Why the last send was refused, shown above the composer; none when it was not. */
  readonly refusal = input<string | null>(null);

  readonly send = output<string>();

  protected readonly inputId = `cf-composer-${nextId++}`;
  protected readonly empty = computed(() => this.draft().trim() === '');

  protected type(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const text = this.draft().trim();
    if (text) {
      this.send.emit(text);
      this.draft.set('');
    }
  }
}
