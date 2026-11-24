import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { PROFILE_SERVICE } from '@cf/api';
import {
  Button,
  Container,
  EmptyState,
  ProfileHero,
  Skeleton,
  SkeletonRegion,
  TagList,
} from '@cf/components';
import { initialsOf, interestLabelsOf } from '@cf/domain';
import { switchMap, tap } from 'rxjs';
import { HttpProfileService } from '../../services/http-profile.service';

/** What the screen shows of another member: only their public fields (ADR 0038). */
interface MemberView {
  id: string;
  name: string;
  initials: string;
  homeChurch: string | null;
  bio: string | null;
  interests: string[];
}

/**
 * Another member's profile at `/members/:id` (L2-005 AC3; ADR 0038): the `profile-hero` with their
 * name, initials and home church (only when they chose to show it), About and Into. It has no
 * email, city, goals or events: the API never answers them. `PROFILE_SERVICE` is bound here so the
 * client lives only while the screen does. A refusal or no answer shows one generic message.
 */
@Component({
  selector: 'cf-member-profile-page',
  imports: [Button, Container, EmptyState, ProfileHero, Skeleton, SkeletonRegion, TagList],
  providers: [{ provide: PROFILE_SERVICE, useClass: HttpProfileService }],
  templateUrl: './member-profile-page.html',
  styleUrl: './member-profile-page.scss',
})
export default class MemberProfilePage {
  private readonly profiles = inject(PROFILE_SERVICE);
  private memberId = '';

  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  protected readonly member = signal<MemberView | null>(null);

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(
        tap(() => this.state.set('loading')),
        switchMap((params) => {
          this.memberId = params.get('id') ?? '';
          return this.profiles.member(this.memberId);
        }),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe({
        next: (profile) => {
          this.member.set({
            id: this.memberId,
            name: profile.name,
            initials: initialsOf(profile.name),
            homeChurch: profile.homeChurch ?? null,
            bio: profile.bio,
            interests: interestLabelsOf(profile.interests),
          });
          this.state.set('loaded');
        },
        error: () => this.state.set('failed'),
      });
  }
}
