import { Component, input } from '@angular/core';

/** A fact's decorative icon; the term already says what it is. */
export type FactIcon = 'calendar' | 'clock' | 'pin' | 'user';

/** One term and its value; a missing optional value reads `missingText`. */
export interface DescriptionItem {
  term: string;
  detail?: string | null;
  icon?: FactIcon;
}

/**
 * The design system's description list (docs/design-system/components/description-list.html): the
 * facts of one thing in a native `<dl>`, each pair grouped in a `<div>`. `facts` shows an icon, a
 * bold term and a muted detail; `spec` a muted term with a bold, right-aligned value and hairlines
 * between. A missing optional value (home church, faith details) reads "Not shared"; it is never
 * required. The stat grid is `cf-stat-grid`. Words are rendered as text.
 */
@Component({
  selector: 'cf-description-list',
  templateUrl: './description-list.html',
  styleUrl: './description-list.scss',
})
export class DescriptionList {
  readonly variant = input<'facts' | 'spec'>('spec');
  readonly items = input.required<readonly DescriptionItem[]>();
  readonly missingText = input('Not shared');
}
