import { booleanAttribute, Component, input } from '@angular/core';
import { Tag } from './tag';

/**
 * The design system's tag list (docs/design-system/components/chip.html, "Tags"): read-only `tag`s
 * that show a member's interests back (each once), in a list that wraps with an 8 px gap. Never controls. Each
 * word is rendered as text.
 */
@Component({
  selector: 'cf-tag-list',
  imports: [Tag],
  templateUrl: './tag-list.html',
  styleUrl: './tag-list.scss',
})
export class TagList {
  readonly tags = input.required<readonly string[]>();
  /** Outlined tags, as a listing's focus shows them. */
  readonly outline = input(false, { transform: booleanAttribute });
}
