import type { DialogRef } from '@angular/cdk/dialog';
import { Component, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type OwnProfileDto, PROFILE_SERVICE } from '@cf/api';
import {
  Button,
  Container,
  EmptyState,
  GoingItem,
  Link,
  List,
  ProfileHero,
  Skeleton,
  SkeletonRegion,
  Split,
  Stack,
  TagList,
} from '@cf/components';
import { goingDateOf, initialsOf, interestLabelsOf, memberSinceOf } from '@cf/domain';
import type { Subscription } from 'rxjs';
import type {
  EditProfileDialog,
  EditProfileResult,
} from '../../dialogs/edit-profile/edit-profile-dialog';
import { HttpProfileService } from '../../services/http-profile.service';

/** What the screen shows of a profile, read for the member (ADR 0015). */
interface ProfileView {
  name: string;
  initials: string;
  memberSince: string;
  homeChurch: string | null;
  city: string | null;
  bio: string | null;
  /** Each goal with its place in the list, which keeps its row. */
  goals: { id: number; text: string }[];
  interests: string[];
  going: GoingRow[];
}

/** One event in "Going to": where it opens, its day, its title and its picture, if any. */
interface GoingRow {
  id: string;
  href: string;
  date: string;
  title: string;
  imageUrl: string | null;
  cancelled: boolean;
}

/**
 * Profile at `/profile` (L2-005 AC1, AC2; ADR 0015): the signed-in member's own profile, from
 * `PROFILE_SERVICE`, bound here so the client lives only while the screen does. It shows the
 * `profile-hero`, About, "Goals this year", Into and "Going to", each empty section with the
 * mock's sentence, and "Browse events" when the member is going to nothing. While it loads it shows
 * the skeletons; a 4xx or no answer shows "Your profile didn't load" with Try again, which asks
 * again in place (a 5xx is the server-error screen's, L2-043 AC4, AC5).
 *
 * Edit profile, and "Add a bio" on an empty About, open the Edit profile dialog (L2-006; ADR 0024)
 * with the profile on screen. Its code and the CDK Dialog are imported on first use, and it opens
 * with this screen's injector, so it uses the same client; it is closed by its ref when the screen
 * goes. The profile it saved replaces the one on screen.
 */
@Component({
  selector: 'cf-profile-page',
  imports: [
    Button,
    Container,
    EmptyState,
    GoingItem,
    Link,
    List,
    ProfileHero,
    Skeleton,
    SkeletonRegion,
    Split,
    Stack,
    TagList,
  ],
  providers: [{ provide: PROFILE_SERVICE, useClass: HttpProfileService }],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export default class ProfilePage {
  private readonly profiles = inject(PROFILE_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private request: Subscription | null = null;
  /** The profile as the API answered it: the dialog's starting values. */
  private own: OwnProfileDto | null = null;
  /** The Edit profile dialog while it shows, or `true` while its code loads: one at a time. */
  private dialog: DialogRef<EditProfileResult, EditProfileDialog> | true | null = null;

  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  protected readonly profile = signal<ProfileView | null>(null);

  constructor() {
    this.load();
    this.destroyRef.onDestroy(() => {
      if (this.dialog && this.dialog !== true) this.dialog.close(null);
    });
  }

  /** Shows the Edit profile dialog with the profile on screen (L2-006 AC1). */
  protected async edit(): Promise<void> {
    const own = this.own;
    if (!own || this.dialog) return;
    this.dialog = true;
    const { openEditProfileDialog } =
      await import('../../dialogs/edit-profile/edit-profile-dialog');
    if (this.destroyRef.destroyed) return;
    const dialog = openEditProfileDialog(this.injector, own);
    this.dialog = dialog;
    dialog.closed.subscribe((saved) => {
      this.dialog = null;
      if (saved) this.show(saved);
    });
  }

  /** Asks for the profile again, in place. */
  protected retry(): void {
    this.load();
  }

  private load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.profiles
      .own()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.show(profile);
          this.state.set('loaded');
        },
        // A 5xx has already opened the server-error screen; anything else shows the failed state.
        error: () => this.state.set('failed'),
      });
  }

  private show(profile: OwnProfileDto): void {
    this.own = profile;
    this.profile.set(viewOf(profile, new Date()));
  }
}

function viewOf(profile: OwnProfileDto, now: Date): ProfileView {
  return {
    name: profile.name,
    initials: initialsOf(profile.name),
    memberSince: memberSinceOf(profile.joinedAt, now),
    homeChurch: profile.homeChurch,
    city: profile.city,
    bio: profile.bio,
    goals: profile.goals.map((text, id) => ({ id, text })),
    interests: interestLabelsOf(profile.interests),
    going: profile.upcomingEvents.map((event) => ({
      id: event.eventId,
      href: `/events/${encodeURIComponent(event.eventId)}`,
      date: goingDateOf(event.startsAt),
      title: event.title,
      imageUrl: event.imageUrl,
      cancelled: event.cancelled,
    })),
  };
}
