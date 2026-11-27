import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PROFILE_SERVICE, type PublicProfileDto } from '@cf/api';
import {
  Button,
  Container,
  EmptyState,
  ErrorPage,
  Footer,
  Masthead,
  ProfileHero,
  Skeleton,
  SkeletonRegion,
  SkipLink,
  TagList,
} from '@cf/components';
import { firstNameOf, initialsOf, interestLabelsOf } from '@cf/domain';
import { switchMap, tap, type Observable } from 'rxjs';
import { HttpProfileService } from '../../services/http-profile.service';

/** What the screen shows of another member: only their public fields (ADR 0038). */
interface MemberView {
  id: string;
  name: string;
  initials: string;
  homeChurch: string | null;
  bio: string | null;
  interests: string[];
  /** Said in place of Message when the member takes messages only from their groups; none otherwise. */
  messagesNote: string | null;
}

/**
 * Another member's profile at `/members/:id` (L2-005 AC3; ADR 0038): the `profile-hero` with their
 * name, initials and home church (only when they chose to show it), About and Into. It has no
 * email, city, goals or events: the API never answers them. `PROFILE_SERVICE` is bound here so the
 * client lives only while the screen does. A 404, which a profile the viewer may not see answers as
 * an unknown id does, shows the not-found view at its address (L2-065 AC2); no answer shows one
 * generic message.
 *
 * Routed twice (L2-065 AC13; ADR 0075): for a visitor (route data `visitor`) under the masthead,
 * from the anonymous endpoint, with name, initials, bio and interests only and "Join to message"
 * in place of Message (L2-005 AC4); and inside the member shell for a member.
 */
@Component({
  selector: 'cf-member-profile-page',
  imports: [
    Button,
    Container,
    EmptyState,
    ErrorPage,
    Footer,
    Masthead,
    ProfileHero,
    Skeleton,
    SkeletonRegion,
    SkipLink,
    TagList,
  ],
  providers: [{ provide: PROFILE_SERVICE, useClass: HttpProfileService }],
  templateUrl: './member-profile-page.html',
  styleUrl: './member-profile-page.scss',
})
export default class MemberProfilePage {
  private readonly profiles = inject(PROFILE_SERVICE);
  private memberId = '';

  /** True for a visitor without a session: the masthead heads the page and Message is Join. */
  protected readonly visitor = inject(ActivatedRoute).snapshot.data['visitor'] === true;
  protected readonly state = signal<'loading' | 'loaded' | 'not-found' | 'failed'>('loading');
  protected readonly member = signal<MemberView | null>(null);

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(
        tap(() => this.state.set('loading')),
        switchMap((params) => {
          this.memberId = params.get('id') ?? '';
          return this.read(this.memberId);
        }),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe({
        next: (profile) => {
          this.member.set({
            id: this.memberId,
            name: profile.name,
            initials: initialsOf(profile.name),
            // A visitor never sees a church, whatever an answer holds (L2-065 AC3).
            homeChurch: this.visitor ? null : (profile.homeChurch ?? null),
            bio: profile.bio,
            interests: interestLabelsOf(profile.interests),
            messagesNote: profile.messagesRestricted
              ? `${firstNameOf(profile.name) ?? 'This member'} only takes messages from people in their groups.`
              : null,
          });
          this.state.set('loaded');
        },
        error: (error: unknown) =>
          this.state.set(
            error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'failed',
          ),
      });
  }

  private read(memberId: string): Observable<PublicProfileDto> {
    return this.visitor ? this.profiles.visitor(memberId) : this.profiles.member(memberId);
  }
}
