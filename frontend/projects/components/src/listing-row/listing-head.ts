import { booleanAttribute, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';
import { ListingMark } from './listing-mark';

/**
 * The design system's listing head (docs/design-system/components/listing-row.html, "Listing
 * head", block `listing-head`): the top of a listing's profile. The `xl` listing mark, the kind as
 * an eyebrow with "· Verified" in words where it is verified, the name as the page's `h1` and the
 * tagline; the screen projects its actions (Message; Follow with journey 8) through
 * `[slot=actions]`. With `loading` it is the same head of skeletons, whose `h1` names what loads.
 * Words are rendered as text.
 */
@Component({
  selector: 'cf-listing-head',
  imports: [ListingMark, Skeleton],
  templateUrl: './listing-head.html',
  styleUrl: './listing-head.scss',
})
export class ListingHead {
  /** The kind's name, such as "Organization". */
  readonly kind = input('');
  readonly name = input('');
  readonly tagline = input('');
  readonly verified = input(false, { transform: booleanAttribute });
  /** A round mark, for a Person, Instructor or Ambassador. */
  readonly person = input(false, { transform: booleanAttribute });
  readonly initials = input('');
  readonly photoSrc = input<string | null>(null);
  readonly loading = input(false, { transform: booleanAttribute });
  /**
   * The listing as it will appear, under a page's own `h1` (the claim screen; ADR 0092): the name is
   * a paragraph, an empty tagline is left out, and the head has no rule or actions.
   */
  readonly preview = input(false, { transform: booleanAttribute });
  /** The hidden heading while it loads, such as "Loading listing". */
  readonly loadingLabel = input('Loading listing');
}
