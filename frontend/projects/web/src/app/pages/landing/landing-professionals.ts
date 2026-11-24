import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PUBLIC_PROFESSIONALS_SERVICE } from '@cf/api';
import {
  Button,
  EmptyState,
  InlineMessage,
  List,
  ServiceRow,
  SkeletonRegion,
} from '@cf/components';
import type { Subscription } from 'rxjs';

/** How many professionals the landing page shows (L2-001 AC5; ADR 0000). */
const MAX = 3;
const SKELETON_ROWS = [{ id: '1' }, { id: '2' }, { id: '3' }];

/** One row of "Meet our professionals", worded for a visitor. */
interface ProfessionalRow {
  id: string;
  name: string;
  text: string;
  price: string;
}

/**
 * The professionals part of the landing page (mock `landing`; L2-001 AC5 to AC7; ADR 0057). It
 * is deferred until it nears the viewport, and loads on its own, so a failure here never touches
 * the events beside it. Skeleton rows while loading, an inline empty message when none are listed
 * and an inline error with Try again when the request fails. Each row leads to Join.
 */
@Component({
  selector: 'cf-landing-professionals',
  imports: [Button, EmptyState, InlineMessage, List, ServiceRow, SkeletonRegion],
  templateUrl: './landing-professionals.html',
  styleUrl: './landing-professionals.scss',
})
export class LandingProfessionals {
  private readonly professionals = inject(PUBLIC_PROFESSIONALS_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | null = null;

  protected readonly skeletons = SKELETON_ROWS;
  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  protected readonly rows = signal<ProfessionalRow[]>([]);

  constructor() {
    this.load();
  }

  /** Asks for the professionals again, in place. */
  protected load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.professionals
      .featured()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (found) => {
          this.rows.set(
            found.slice(0, MAX).map((p, index) => ({
              id: String(index),
              name: p.name,
              text: `${p.role} · ${p.where}`,
              price: p.price,
            })),
          );
          this.state.set('loaded');
        },
        error: () => this.state.set('failed'),
      });
  }
}
