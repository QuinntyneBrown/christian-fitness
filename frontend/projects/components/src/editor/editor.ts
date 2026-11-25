import { booleanAttribute, Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';
import { Link } from '../link/link';
import { Skeleton } from '../skeleton/skeleton';
import { SkeletonRegion } from '../skeleton/skeleton-region';

/**
 * The design system's story editor (docs/design-system/components/editor.html, block `editor`):
 * a sticky bar with the way back, the status, when it was last saved and the actions; the alert
 * and lead image above the story; the Headline, Summary and Story, each a real labelled textarea;
 * and the Publishing panel beside them. The status (`[slot=status]`), the actions
 * (`[slot=actions]`), the alert (`[slot=alert]`), the image (`[slot=image]`) and the panel's cards
 * (`[slot=side]`) are projected; each text is typed into a textarea and reported, never rendered
 * as HTML. While `loading`, the bar holds only the way back and skeletons stand in for the rest.
 * A plain click on the way back emits `navigate`; a modified click is left to the browser.
 */
@Component({
  selector: 'cf-editor',
  imports: [Link, Skeleton, SkeletonRegion],
  templateUrl: './editor.html',
  styleUrl: './editor.scss',
})
export class Editor {
  /** The page's one heading, read by assistive technology: "New story" or "Edit story". */
  readonly heading = input.required<string>();
  readonly backHref = input.required<string>();
  readonly backLabel = input('Stories');
  /** "Saved 2 min ago", "Saving…" or "Not saved"; hidden below 640 px, as the mock hides it. */
  readonly saved = input('');
  readonly headline = input('');
  readonly summary = input('');
  readonly text = input('');
  /** An empty headline or text after Publish is marked (L2-069 AC7). */
  readonly headlineInvalid = input(false, { transform: booleanAttribute });
  readonly textInvalid = input(false, { transform: booleanAttribute });
  /** While an action runs, the text can be read and selected but not changed. */
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });

  readonly headlineChange = output<string>();
  readonly summaryChange = output<string>();
  readonly textChange = output<string>();
  /** A plain click on the way back, with its `href`. */
  readonly navigate = output<string>();

  protected back(event: MouseEvent): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(this.backHref());
  }

  protected valueOf(event: Event): string {
    return (event.target as HTMLTextAreaElement).value;
  }
}
