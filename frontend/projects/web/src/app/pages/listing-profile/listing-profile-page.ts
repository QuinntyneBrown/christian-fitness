import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DIRECTORY_SERVICE, type ListingProfileDto } from '@cf/api';
import {
  Alert,
  Button,
  Container,
  type DescriptionItem,
  DescriptionList,
  EmptyState,
  ErrorPage,
  Hosting,
  isPlainClick,
  Link,
  List,
  ListingHead,
  ListingMark,
  MiniRow,
  SkeletonRegion,
  Skeleton,
  Split,
  TagList,
} from '@cf/components';
import {
  connectionRowViewOf,
  hostingEmptyText,
  hostingRowViewOf,
  listingProfileViewOf,
} from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpDirectoryService } from '../../services/http-directory.service';

/**
 * A listing's profile at `/directory/:id` (L2-055; ADR 0087; mock `listing-profile/`): the back
 * link to the directory, the listing head, Hosting (its one-off events still to come, each leading
 * to the event, or a sentence when there are none), About with its focus tags, and beside it from LG the key
 * facts (area, an https website, followers and the year listed) and Connected (each published
 * listing it is linked to, with the relation and kind, leading to that profile).
 * `DIRECTORY_SERVICE` is bound
 * here, so the client and its request live only while the screen does. While it loads, the head
 * and the columns are skeletons; an id that is not published (404) shows the not-found view; any
 * other failure shows "This listing didn't load" with Try again and Directory (a 5xx is the
 * server-error screen's). Every word the listing gives is rendered as text.
 */
@Component({
  selector: 'cf-listing-profile-page',
  imports: [
    Alert,
    Button,
    Container,
    DescriptionList,
    EmptyState,
    ErrorPage,
    Hosting,
    Link,
    List,
    ListingHead,
    ListingMark,
    MiniRow,
    Skeleton,
    SkeletonRegion,
    Split,
    TagList,
  ],
  providers: [{ provide: DIRECTORY_SERVICE, useClass: HttpDirectoryService }],
  templateUrl: './listing-profile-page.html',
  styleUrl: './listing-profile-page.scss',
})
export default class ListingProfilePage {
  private readonly directory = inject(DIRECTORY_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private id = '';
  private request: Subscription | null = null;
  private messaging: Subscription | null = null;

  protected readonly state = signal<'loading' | 'loaded' | 'not-found' | 'failed'>('loading');
  protected readonly profile = signal<ListingProfileDto | null>(null);
  /** Message could not open the conversation: a refusal or a lost connection. */
  protected readonly messageFailed = signal(false);
  protected readonly view = computed(() => {
    const profile = this.profile();
    return profile ? listingProfileViewOf(profile) : null;
  });
  protected readonly hosting = computed(() => this.profile()?.hosting.map(hostingRowViewOf) ?? []);
  protected readonly hostingEmpty = computed(() => hostingEmptyText(this.profile()?.name ?? ''));
  protected readonly connections = computed(
    () => this.profile()?.connections.map(connectionRowViewOf) ?? [],
  );
  protected readonly facts = computed<readonly DescriptionItem[]>(() => {
    const profile = this.profile();
    const view = this.view();
    if (!profile || !view) return [];
    return [
      { term: 'Area', detail: profile.area, icon: 'pin' },
      ...(view.website
        ? [{ term: 'Website', link: view.website, icon: 'globe' } satisfies DescriptionItem]
        : []),
      { term: 'Followers', detail: view.followers },
      { term: 'On Christian Fitness', detail: view.since },
    ];
  });

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.id = params.get('id') ?? '';
        this.load();
      });
  }

  /** Follows a link inside the app through the router. */
  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

  /** Routes a plain click on a link; any other click is the browser's. */
  protected follow(event: MouseEvent, href: string): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.navigate(href);
  }

  /**
   * Asks who receives the listing's messages and opens that conversation (L2-055 AC6). A refusal
   * or a lost connection shows one generic alert; a click while asking is ignored.
   */
  protected message(): void {
    if (this.messaging) return;
    this.messageFailed.set(false);
    this.messaging = this.directory
      .startConversation(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ memberId }) => {
          this.messaging = null;
          void this.router.navigateByUrl(`/messages/${encodeURIComponent(memberId)}`);
        },
        error: () => {
          this.messaging = null;
          this.messageFailed.set(true);
        },
      });
  }

  /** Asks for the profile again, in place. */
  protected retry(): void {
    this.load();
  }

  private load(): void {
    this.request?.unsubscribe();
    this.messaging?.unsubscribe();
    this.messaging = null;
    this.messageFailed.set(false);
    this.state.set('loading');
    this.request = this.directory
      .get(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.profile.set(profile);
          this.state.set('loaded');
        },
        // A 5xx has already opened the server-error screen; a 404 is "not found", anything else "failed".
        error: (error: unknown) =>
          this.state.set(
            error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'failed',
          ),
      });
  }
}
