import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type OwnProfileDto, PROFILE_SERVICE } from '@cf/api';
import {
  EmptyInline,
  ErrorState,
  GoingList,
  type GoingItem,
  ProfileHero,
  ProfileSkeleton,
  TagList,
  TextLink,
} from '@cf/components';
import { goingDateOf, initialsOf, interestLabelsOf, memberSinceOf } from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpProfileService } from '../../services/http-profile.service';

/** What the screen shows of a profile, read for the member (ADR 0013). */
interface ProfileView {
  name: string;
  initials: string;
  memberSince: string;
  homeChurch: string | null;
  city: string | null;
  bio: string | null;
  goals: string[];
  interests: string[];
  going: GoingItem[];
}

/**
 * Profile at `/profile` (L2-005 AC1, AC2; ADR 0013): the signed-in member's own profile, from
 * `PROFILE_SERVICE`, bound here so the client lives only while the screen does. It shows the
 * `profile-hero`, About, "Goals this year", Into and "Going to", each empty section with the
 * mock's sentence, and "Browse events" when the member is going to nothing. While it loads it shows
 * the skeletons; a 4xx or no answer shows "Your profile didn't load" with Try again, which asks
 * again in place (a 5xx is the server-error screen's, L2-043 AC4, AC5).
 */
@Component({
  selector: 'cf-profile-page',
  imports: [EmptyInline, ErrorState, GoingList, ProfileHero, ProfileSkeleton, TagList, TextLink],
  providers: [{ provide: PROFILE_SERVICE, useClass: HttpProfileService }],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
})
export class ProfilePage {
  private readonly profiles = inject(PROFILE_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | null = null;

  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  protected readonly profile = signal<ProfileView | null>(null);

  constructor() {
    this.load();
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
          this.profile.set(viewOf(profile, new Date()));
          this.state.set('loaded');
        },
        // A 5xx has already opened the server-error screen; anything else shows the failed state.
        error: () => this.state.set('failed'),
      });
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
    goals: profile.goals,
    interests: interestLabelsOf(profile.interests),
    going: profile.upcomingEvents.map((event) => ({
      href: `/events/${encodeURIComponent(event.eventId)}`,
      date: goingDateOf(event.startsAt),
      title: event.title,
      imageUrl: event.imageUrl,
    })),
  };
}
