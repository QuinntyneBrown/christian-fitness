import type { DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PROFESSIONAL_APPLICATIONS_SERVICE,
  SERVICES_SERVICE,
  type ServiceCategory,
  type ServiceListingDto,
} from '@cf/api';
import {
  Button,
  Chip,
  ChipBar,
  Container,
  EmptyState,
  List,
  ServiceDetail,
  ServiceRow,
  SkeletonRegion,
  Split,
} from '@cf/components';
import {
  listingHref,
  noCategoryServicesText,
  selectedListing,
  serviceCategoryChips,
  serviceCategoryOf,
  type ServiceRowView,
  serviceRowViewOf,
  verifiedText,
} from '@cf/domain';
import type { Subscription } from 'rxjs';
import type {
  ApplyToBeListedDialog,
  ApplyToBeListedResult,
} from '../../dialogs/apply-to-be-listed/apply-to-be-listed-dialog';
import { HttpProfessionalApplicationsService } from '../../services/http-professional-applications.service';
import { HttpServicesService } from '../../services/http-services.service';

/** The width from which the card shows beside the list (the design system's LG, 1024 px). */
const LG_WIDTH = '64rem';

/** How many skeleton rows stand in while the list loads (mock `services/loading`). */
const SKELETON_ROWS = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }];

/**
 * Services at `/services` (mock `docs/mocks/pages/services/`; L2-013 AC1 to AC3, L2-026; ADR 0047,
 * 0050): the professionals the team has listed, in name order and at most 50, filtered by the
 * category in the address (`?category=`), with the selected one's card beside the list (`?selected=`;
 * the first when the address names none). Choosing a chip or a row navigates, so the address, the
 * back button and a reload agree; only a new category asks the API again. Below LG the card is
 * hidden and a row opens the listing's own screen at `/services/:id` (L2-013 AC4; ADR 0051). While the list loads it
 * shows skeleton rows; with nobody listed it says so and points to events; a 4xx or no answer
 * shows "Professionals didn't load" with Try again (a 5xx is the server-error screen's, L2-043
 * AC4). `SERVICES_SERVICE` and `PROFESSIONAL_APPLICATIONS_SERVICE` are bound here, so the clients
 * live only while the screen does, and the request goes with it. The Apply to be listed dialog's
 * code and the CDK Dialog are imported on first use, it opens with this screen's injector, and it is
 * closed by its ref when the screen goes.
 */
@Component({
  selector: 'cf-services-page',
  imports: [
    Button,
    Chip,
    ChipBar,
    Container,
    EmptyState,
    List,
    ServiceDetail,
    ServiceRow,
    SkeletonRegion,
    Split,
  ],
  providers: [
    { provide: SERVICES_SERVICE, useClass: HttpServicesService },
    {
      provide: PROFESSIONAL_APPLICATIONS_SERVICE,
      useClass: HttpProfessionalApplicationsService,
    },
  ],
  templateUrl: './services-page.html',
  styleUrl: './services-page.scss',
})
export default class ServicesPage {
  private readonly services = inject(SERVICES_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private request: Subscription | null = null;
  /** The Apply to be listed dialog while it shows, or `true` while its code loads: one at a time. */
  private dialog: DialogRef<ApplyToBeListedResult, ApplyToBeListedDialog> | true | null = null;
  private asked = false;

  protected readonly skeletons = SKELETON_ROWS;
  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  protected readonly category = signal<ServiceCategory | null>(null);
  private readonly selectedId = signal<string | null>(null);
  private readonly listings = signal<readonly ServiceListingDto[]>([]);

  protected readonly chips = computed(() => serviceCategoryChips(this.category()));
  protected readonly noResultsText = computed(() => {
    const current = this.category();
    return current === null ? '' : noCategoryServicesText(current);
  });
  /** The listing whose card shows, and the row that is current. */
  protected readonly selected = computed(() => selectedListing(this.listings(), this.selectedId()));
  protected readonly rows = computed(() =>
    this.listings().map((listing) => serviceRowViewOf(listing, this.category())),
  );
  protected readonly verified = computed(() => {
    const listing = this.selected();
    return listing ? verifiedText(listing.publishedAt) : '';
  });

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const category = serviceCategoryOf(params.get('category'));
        this.selectedId.set(params.get('selected'));
        if (this.asked && category === this.category()) return;
        this.asked = true;
        this.category.set(category);
        this.load();
      });
    this.destroyRef.onDestroy(() => {
      if (this.dialog && this.dialog !== true) this.dialog.close(false);
    });
  }

  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

  /**
   * Chooses a row (L2-013 AC3, AC4): from LG the card beside the list changes; below it the
   * listing opens as its own screen with a back action.
   */
  protected open(row: ServiceRowView): void {
    const beside = window.matchMedia(`(min-width: ${LG_WIDTH})`).matches;
    this.navigate(beside ? row.href : listingHref(row.id, this.category()));
  }

  /** Asks for the list again, in place. */
  protected retry(): void {
    this.load();
  }

  /** Shows the Apply to be listed dialog. */
  protected async apply(): Promise<void> {
    if (this.dialog) return;
    this.dialog = true;
    const { openApplyToBeListedDialog } =
      await import('../../dialogs/apply-to-be-listed/apply-to-be-listed-dialog');
    if (this.destroyRef.destroyed) return;
    const dialog = openApplyToBeListedDialog(this.injector);
    this.dialog = dialog;
    dialog.closed.subscribe(() => (this.dialog = null));
  }

  private load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.listings.set([]);
    this.request = this.services
      .list(this.category())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (answer) => {
          this.listings.set(answer.services);
          this.state.set('loaded');
        },
        // A 5xx has already opened the server-error screen; anything else shows the failed state.
        error: () => this.state.set('failed'),
      });
  }
}
