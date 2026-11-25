import { inject, Injectable, type OnDestroy, signal } from '@angular/core';
import {
  DIRECTORY_SERVICE,
  type FollowableListing,
  type ListingFollowsApi,
  type ListingFollowState,
} from '@cf/api';
import type { Subscription } from 'rxjs';

/**
 * {@link ListingFollowsApi} over `DIRECTORY_SERVICE` (L2-056; ADR 0088). A press changes the
 * listing at once, the count by one, and the server's answer settles it. Provided on the routed
 * component of the screen that shows Follow, so its requests end with the visit.
 */
@Injectable()
export class ListingFollowStore implements ListingFollowsApi, OnDestroy {
  private readonly directory = inject(DIRECTORY_SERVICE);
  private readonly shown = signal<ReadonlyMap<string, ListingFollowState>>(new Map());
  private readonly requests = new Map<string, Subscription>();

  readonly follows = this.shown.asReadonly();

  track(listings: readonly FollowableListing[]): void {
    const next = new Map<string, ListingFollowState>();
    for (const listing of listings) {
      next.set(listing.id, {
        following: listing.following,
        followers: listing.followers ?? null,
        busy: false,
      });
    }
    this.shown.set(next);
  }

  toggle(id: string, name: string): void {
    void name;
    const before = this.shown().get(id);
    if (!before) return;
    const following = !before.following;
    this.set(id, {
      following,
      followers: before.followers === null ? null : before.followers + (following ? 1 : -1),
      busy: false,
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
