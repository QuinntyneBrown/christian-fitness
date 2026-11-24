import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { SERVICES_SERVICE, type ServiceListingDto } from '@cf/api';
import {
  Button,
  Container,
  EmptyState,
  ErrorPage,
  Link,
  ServiceDetail,
  SkeletonRegion,
} from '@cf/components';
import { serviceCategoryOf, servicesHref, verifiedText } from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpServicesService } from '../../services/http-services.service';
import { ProfessionalContact } from '../../services/professional-contact';

/**
 * One professional's listing at `/services/:id` (L2-013 AC4; ADR 0051): the card with name, role,
 * where, about, credentials, rate and the verified line, and a back action to Services in the
 * category the list was filtered by (`?category=`). Below LG a row on Services opens it; from LG
 * the card shows beside the list instead. `SERVICES_SERVICE` is bound here, so the client lives
 * only while the screen does. While it loads it shows a skeleton card; an id that is not there
 * (404) shows the not-found screen; any other failure shows "This professional didn't load" with
 * Try again (a 5xx is the server-error screen's, L2-043 AC4). The card's Message or Contact acts
 * through `ProfessionalContact` (L2-014; ADR 0052).
 */
@Component({
  selector: 'cf-service-detail-page',
  imports: [Button, Container, EmptyState, ErrorPage, Link, ServiceDetail, SkeletonRegion],
  providers: [{ provide: SERVICES_SERVICE, useClass: HttpServicesService }, ProfessionalContact],
  templateUrl: './service-detail-page.html',
  styleUrl: './service-detail-page.scss',
})
export default class ServiceDetailPage {
  private readonly services = inject(SERVICES_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly contact = inject(ProfessionalContact);
  private id = '';
  private request: Subscription | null = null;

  protected readonly state = signal<'loading' | 'loaded' | 'not-found' | 'failed'>('loading');
  protected readonly listing = signal<ServiceListingDto | null>(null);
  protected readonly backHref = signal('/services');
  protected readonly verified = computed(() => {
    const listing = this.listing();
    return listing ? verifiedText(listing.publishedAt) : '';
  });

  constructor() {
    const route = inject(ActivatedRoute);
    route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.backHref.set(servicesHref(serviceCategoryOf(params.get('category')), null));
    });
    route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.id = params.get('id') ?? '';
      this.load();
    });
  }

  /** Asks for the listing again, in place. */
  protected retry(): void {
    this.load();
  }

  private load(): void {
    this.request?.unsubscribe();
    this.contact.reset();
    this.state.set('loading');
    this.request = this.services
      .get(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (listing) => {
          this.listing.set(listing);
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
