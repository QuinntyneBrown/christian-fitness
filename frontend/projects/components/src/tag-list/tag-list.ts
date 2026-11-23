import { Component, input } from '@angular/core';

/**
 * The design system's `tag-list` of `tag`s (docs/design-system/assets/components.css): the
 * profile's interests, each rendered as text.
 */
@Component({
  selector: 'cf-tag-list',
  templateUrl: './tag-list.html',
  styleUrl: './tag-list.scss',
})
export class TagList {
  readonly tags = input.required<readonly string[]>();
}
