import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, input, output } from '@angular/core';
import { isPlainClick } from '../link/plain-click';
import { Skeleton } from '../skeleton/skeleton';
import { ListingMark } from './listing-mark';
import { VerifiedMark } from './verified-mark';

/**
 * The design system's listing row (docs/design-system/components/listing-row.html, block
 * `listing-row`): the listing head (mark, name, verified mark, tagline, area and what it hosts).
 * Below 768 px the area follows the tagline (`__area--inline`); from 768 px it is a column
 * (`__area--col`), and from 1024 px a hosting column appears, accented when it hosts anything.
 * With `href` the head is a link (a plain click emits `navigate`); without one it is not, until the
 * listing profile exists (ADR 0082). With `loading` it is the same row of skeletons. Words are
 * rendered as text.
 */
@Component({
  selector: 'cf-listing-row',
  imports: [ListingMark, NgTemplateOutlet, Skeleton, VerifiedMark],
  templateUrl: './listing-row.html',
  styleUrl: './listing-row.scss',
})
export class ListingRow {
  readonly href = input<string | null>(null);
  readonly name = input('');
  readonly tagline = input('');
  readonly area = input('');
  readonly verified = input(false, { transform: booleanAttribute });
  /** A round mark, for a Person, Instructor or Ambassador. */
  readonly person = input(false, { transform: booleanAttribute });
  readonly initials = input('');
  readonly photoSrc = input<string | null>(null);
  /** "<n> hosting" or "No events yet". */
  readonly hosting = input('');
  readonly hostingSome = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly navigate = output<string>();

  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
