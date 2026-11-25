import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Link } from '../link/link';

/** A fact's decorative icon; the term already says what it is. */
export type FactIcon = 'calendar' | 'clock' | 'globe' | 'pin' | 'user';

/** A value that is a website: it opens in a new tab, without access to this page. */
export interface DescriptionLink {
  href: string;
  text: string;
}

/**
 * One term and its value; a missing optional value reads `missingText`. A `link` value is a
 * website that opens in a new tab (`rel="noopener noreferrer"`), which it says to assistive
 * technology.
 */
export interface DescriptionItem {
  term: string;
  detail?: string | null;
  link?: DescriptionLink;
  icon?: FactIcon;
}

/**
 * The design system's description list (docs/design-system/components/description-list.html): the
 * facts of one thing in a native `<dl>`, each pair grouped in a `<div>`. `facts` shows an icon, a
 * bold term and a muted detail; `spec` a muted term with a bold, right-aligned value and hairlines
 * between, and an optional icon before the term (a listing's key facts). A missing optional value (home church, faith details) reads "Not shared"; it is never
 * required. The stat grid is `cf-stat-grid`. Words are rendered as text.
 */
@Component({
  selector: 'cf-description-list',
  imports: [Link, NgTemplateOutlet],
  templateUrl: './description-list.html',
  styleUrl: './description-list.scss',
})
export class DescriptionList {
  readonly variant = input<'facts' | 'spec'>('spec');
  readonly items = input.required<readonly DescriptionItem[]>();
  readonly missingText = input('Not shared');

  /** Each item as its templates' context, made here so the template builds no object per check. */
  protected readonly rows = computed(() => this.items().map((item) => ({ $implicit: item })));
}
