import { inject, Injectable, type OnDestroy, signal } from '@angular/core';
import {
  DIRECTORY_SERVICE,
  type FollowableListing,
  type ListingFollowsApi,
  type ListingFollowState,
  TOASTS_SERVICE,
} from '@cf/api';
import type { Subscription } from 'rxjs';

/** What the failure toast says after its title (L2-056 AC3; mock `directory/follow-failed`). */
export const FOLLOW_FAILED_TEXT = 'Try again in a moment.';

/** The failure toast's title, naming the listing: "We couldn't follow <name>" or "unfollow". */
export function followFailedTitle(following: boolean, name: string): string {
  return `We couldn't ${following ? 'follow' : 'unfollow'} ${name}`;
}

/**
 * {@link ListingFollowsApi} over `DIRECTORY_SERVICE` (L2-056; ADR 0088). A press changes the
 * listing at once, the count by one, and marks it in flight, so a second press does nothing until
 * the server answers (AC8); the answer settles it. Any failure, a refusal by code included, puts the
 * listing back as it was and shows "We couldn't follow <name>" (or "unfollow") through the screen's
 * `TOASTS_SERVICE` (AC3, AC5, AC9). A newly loaded listing never overwrites one in flight. Provided
 * on the routed component of the screen that shows Follow, so its requests end with the visit.
 */
@Injectable()
export class ListingFollowStore implements ListingFollowsApi, OnDestroy {
  private readonly directory = inject(DIRECTORY_SERVICE);
  private readonly toasts = inject(TOASTS_SERVICE);
  private readonly shown = signal<ReadonlyMap<string, ListingFollowState>>(new Map());
  private readonly requests = new Map<string, Subscription>();

  readonly follows = this.shown.asReadonly();

  track(listings: readonly FollowableListing[]): void {
    const before = this.shown();
    const next = new Map<string, ListingFollowState>();
    // A change in flight keeps its state until it settles, whatever the screen loaded meanwhile.
    for (const [id, state] of before) if (state.busy) next.set(id, state);
    for (const listing of listings) {
      if (next.has(listing.id)) continue;
      next.set(listing.id, {
        following: listing.following,
        followers: listing.followers ?? null,
        busy: false,
      });
    }
    this.shown.set(next);
  }

  toggle(id: string, name: string): void {
    const before = this.shown().get(id);
    if (!before || before.busy) return;
    const following = !before.following;
    this.set(id, {
      following,
      followers: before.followers === null ? null : before.followers + (following ? 1 : -1),
      busy: true,
    });
    const request = following ? this.directory.follow(id) : this.directory.unfollow(id);
    this.requests.set(
      id,
      request.subscribe({
        next: (answer) => {
          this.requests.delete(id);
          this.set(id, {
            following: answer.following,
            followers: before.followers === null ? null : answer.followers,
            busy: false,
          });
        },
        error: () => {
          this.requests.delete(id);
          this.set(id, { ...before, busy: false });
          this.toasts.show(followFailedTitle(following, name), FOLLOW_FAILED_TEXT);
        },
      }),
    );
  }

  ngOnDestroy(): void {
    for (const request of this.requests.values()) request.unsubscribe();
    this.requests.clear();
  }

  private set(id: string, state: ListingFollowState): void {
    this.shown.update((shown) => new Map(shown).set(id, state));
  }
}
