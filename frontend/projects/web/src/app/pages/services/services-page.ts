import type { DialogRef } from '@angular/cdk/dialog';
import { Component, DestroyRef, inject, Injector } from '@angular/core';
import { PROFESSIONAL_APPLICATIONS_SERVICE } from '@cf/api';
import { Button, Container } from '@cf/components';
import type {
  ApplyToBeListedDialog,
  ApplyToBeListedResult,
} from '../../dialogs/apply-to-be-listed/apply-to-be-listed-dialog';
import { HttpProfessionalApplicationsService } from '../../services/http-professional-applications.service';

/**
 * Services at `/services` (mock `docs/mocks/pages/services/`). So far it holds the heading, the
 * subtitle and "Apply to be listed" (L2-026; ADR 0047); the professionals' list joins in slice 16.1.
 * `PROFESSIONAL_APPLICATIONS_SERVICE` is bound here, so the client lives only while the screen does.
 * The dialog's code and the CDK Dialog are imported on first use, it opens with this screen's
 * injector, so it uses the same client, and it is closed by its ref when the screen goes.
 */
@Component({
  selector: 'cf-services-page',
  imports: [Button, Container],
  providers: [
    {
      provide: PROFESSIONAL_APPLICATIONS_SERVICE,
      useClass: HttpProfessionalApplicationsService,
    },
  ],
  templateUrl: './services-page.html',
  styleUrl: './services-page.scss',
})
export class ServicesPage {
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  /** The Apply to be listed dialog while it shows, or `true` while its code loads: one at a time. */
  private dialog: DialogRef<ApplyToBeListedResult, ApplyToBeListedDialog> | true | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.dialog && this.dialog !== true) this.dialog.close(false);
    });
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
}
