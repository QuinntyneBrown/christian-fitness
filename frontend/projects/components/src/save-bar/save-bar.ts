import { booleanAttribute, Component, input, output } from '@angular/core';
import { Button } from '../button/button';

/**
 * The design system's save bar (docs/design-system/components/save-bar.html, block `save-bar`): a
 * pill fixed at the bottom that holds a page's unsaved changes, their Save action and the result of
 * saving. It reads "Unsaved changes" with Save, "Saving…" while it waits, "Preferences saved" with
 * a check mark, or that saving failed with Try again as an alert. On a phone it sits above the tab
 * bar and never covers it. The words are the consumer's and are rendered as text.
 */
@Component({
  selector: 'cf-save-bar',
  imports: [Button],
  templateUrl: './save-bar.html',
  styleUrl: './save-bar.scss',
})
export class SaveBar {
  readonly text = input.required<string>();
  /** The button's word ("Save", "Saving…", "Try again"); none draws no button. */
  readonly action = input<string | null>(null);
  readonly busy = input(false, { transform: booleanAttribute });
  /** `alert` when saving failed, `status` otherwise. */
  readonly role = input<'status' | 'alert'>('status');
  /** Just saved: the text takes its check mark. */
  readonly done = input(false, { transform: booleanAttribute });

  readonly save = output<void>();
}
