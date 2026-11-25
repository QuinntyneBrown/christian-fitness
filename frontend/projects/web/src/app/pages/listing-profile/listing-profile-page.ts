import { HttpErrorResponse } from '@angular/common/http';
import type { DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  DIRECTORY_SERVICE,
  LISTING_FOLLOWS,
  type ListingProfileDto,
  TOASTS_SERVICE,
} from '@cf/api';
import {
  Alert,
  Button,
  Container,
  type DescriptionItem,
  DescriptionList,
  EmptyState,
  ErrorPage,
  FollowButton,
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
  type ToastData,
  ToastRegion,
} from '@cf/components';
import {
  connectionRowViewOf,
  followerCountText,
  hostingEmptyText,
  hostingRowViewOf,
  ListingFollowStore,
  listingProfileViewOf,
  ToastStore,
} from '@cf/domain';
import type { Subscription } from 'rxjs';
import type {
  OwnerListingEditorDialog,
  OwnerListingEditorResult,
} from '../../dialogs/owner-listing-editor/owner-listing-editor-dialog';
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
    FollowButton,
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
    ToastRegion,
  ],
  providers: [
    { provide: DIRECTORY_SERVICE, useClass: HttpDirectoryService },
    { provide: LISTING_FOLLOWS, useClass: ListingFollowStore },
    { provide: TOASTS_SERVICE, useClass: ToastStore },
  ],
  templateUrl: './listing-profile-page.html',
  styleUrl: './listing-profile-page.scss',
})
export default class ListingProfilePage {
  private readonly directory = inject(DIRECTORY_SERVICE);
  private readonly follows = inject(LISTING_FOLLOWS);
  protected readonly toasts = inject(TOASTS_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private id = '';
  /** The owner's editor while it is open, or `true` while its code loads. */
  private editor: DialogRef<OwnerListingEditorResult, OwnerListingEditorDialog> | true | null =
    null;
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
  /** The member's follow of the listing and its count, changed at a press (L2-056); none for the owner. */
  protected readonly follow = computed(() => {
    const profile = this.profile();
    // The owner sees Edit listing in place of Follow (L2-079 AC1).
    if (!profile || profile.isOwner) return null;
    return this.follows.follows().get(profile.id) ?? null;
  });
  /** A failed follow or unfollow, as a danger toast (L2-056 AC3; mock `directory/follow-failed`). */
  protected readonly toastViews = computed<ToastData[]>(() =>
    this.toasts.toasts().map(({ id, title, text }) => ({
      id: String(id),
      tone: 'danger',
      heading: title,
      text,
    })),
  );
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
      {
        term: 'Followers',
        detail: followerCountText(this.follow()?.followers ?? profile.followers),
      },
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
    // A dialog is closed by its ref before the screen goes (AGENTS.md).
    inject(DestroyRef).onDestroy(() => {
      if (this.editor && this.editor !== true) this.editor.close();
    });
  }

  /**
   * Opens the owner's editor on the listing (L2-079 AC1, AC2; ADR 0093). Its code and the CDK
   * Dialog are imported on first use; it opens with this screen's injector, so it uses the same
   * client.
   */
  protected async editListing(listing: ListingProfileDto): Promise<void> {
    if (this.editor) return;
    this.editor = true;
    const { openOwnerListingEditor } =
      await import('../../dialogs/owner-listing-editor/owner-listing-editor-dialog');
    if (this.destroyRef.destroyed) return;
    const editor = openOwnerListingEditor(this.injector, listing);
    this.editor = editor;
    editor.closed.subscribe(() => {
      this.editor = null;
    });
  }

  /** Follows a link inside the app through the router. */
  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

  /** Follows or unfollows the listing at once (L2-056 AC1 to AC3). */
  protected toggleFollow(listing: ListingProfileDto): void {
    this.follows.toggle(listing.id, listing.name);
  }

  protected dismissToast(id: string): void {
    this.toasts.dismiss(Number(id));
  }

  /** Routes a plain click on a link; any other click is the browser's. */
  protected route(event: MouseEvent, href: string): void {
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
          this.follows.track([profile]);
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
