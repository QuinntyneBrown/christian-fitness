import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, Component, input, output } from '@angular/core';
import { FollowButton } from '../follow-button/follow-button';
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
 * listing profile exists (ADR 0082). After the head comes the follow button (L2-056; ADR 0088):
 * pressed where `following`, `aria-disabled` while `followBusy`, and a press emits `followToggled`.
 * With `loading` it is the same row of skeletons, with no button. Words are rendered as text.
 */
@Component({
  selector: 'cf-listing-row',
  imports: [FollowButton, ListingMark, NgTemplateOutlet, Skeleton, VerifiedMark],
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
  /** Whether the member follows it (L2-056). */
  readonly following = input(false, { transform: booleanAttribute });
  /** Its follow or unfollow is on its way (L2-056 AC8). */
  readonly followBusy = input(false, { transform: booleanAttribute });
  readonly navigate = output<string>();
  readonly followToggled = output<void>();

  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate.emit(href);
  }
}
