import { Dialog as CdkDialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SERVICES_SERVICE } from '@cf/api';
import { Alert, Button, Dialog, FormLayout, Select, Textarea, TextField } from '@cf/components';
import {
  BOOKING_KIND_OPTIONS,
  type BookingField,
  type BookingFieldErrors,
  type BookingForm,
  bookingFirstName,
  bookingKindLabel,
  bookingKindOf,
  bookingRefusalOf,
  type BookingRefusal,
  bookingRequestOf,
  bookingSummaryOf,
  clearBookingError,
  emptyBookingForm,
  validateBooking,
} from '@cf/domain';

/** The listing the dialog asks about: what its subtitle names and where the request goes. */
export interface RequestBookingTarget {
  id: string;
  name: string;
  role: string;
  price: string;
}

/** What the dialog closes with: the professional's member id when the member chose Go to messages, else `null`. */
export type RequestBookingResult = string | null;

/**
 * The Request a booking dialog (L2-014 AC3 to AC5; ADR 0053; mock `docs/mocks/dialogs/request-booking/`),
 * a CDK Dialog that renders the library's `cf-dialog` shell around the library's form controls. It
 * opens on What would you like, the free intro call chosen. Before sending, `validateBooking` names
 * each field to fix and nothing is sent (mock `invalid`). While the send is on its way the button
 * reads "Sending…", the fields hold still and Cancel is disabled; Close, Escape and the scrim do
 * nothing (mock `busy`). A refusal or no answer keeps the dialog and every value with a message
 * (mock `failed`). Once sent it shows "Request sent" (mock `success`): Done closes it, Go to
 * messages closes it with the professional's member id for the screen to open. It uses the
 * `SERVICES_SERVICE` of the screen that opened it.
 */
@Component({
  selector: 'cf-request-booking-dialog',
  imports: [Alert, Button, Dialog, FormLayout, Select, Textarea, TextField],
  templateUrl: './request-booking-dialog.html',
  styleUrl: './request-booking-dialog.scss',
})
export class RequestBookingDialog {
  private readonly services = inject(SERVICES_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref: DialogRef<RequestBookingResult, RequestBookingDialog> = inject(DialogRef);
  private readonly target: RequestBookingTarget = inject(DIALOG_DATA);
  /** The professional's member id once the request was sent. */
  private professional = '';

  protected readonly firstName = bookingFirstName(this.target.name);
  protected readonly kinds = BOOKING_KIND_OPTIONS;
  protected readonly form = signal<BookingForm>(emptyBookingForm());
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly fieldErrors = signal<BookingFieldErrors>({});
  protected readonly summary = computed(() => bookingSummaryOf(this.fieldErrors()));
  /** What the last answer refused, until the next send. */
  protected readonly refusal = signal<BookingRefusal | null>(null);
  protected readonly values = this.form.asReadonly();
  protected readonly subtitle = computed(() =>
    this.sent()
      ? `${this.target.name} · ${bookingKindLabel(this.values().kind)}`
      : `${this.target.name} · ${this.target.role} · ${this.target.price}`,
  );
  protected readonly successText = computed(() =>
    this.sent()
      ? `${this.firstName} will reply in your messages, usually within a day. We've started the conversation for you.`
      : undefined,
  );

  constructor() {
    // The dialog opens with `disableClose`, so Escape is the screen's to decide.
    this.ref.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.dismiss();
    });
  }

  /** Keeps what the member typed in `field` and clears that field's error. */
  protected edit(field: BookingField, value: string): void {
    this.form.update((form) => ({ ...form, [field]: value }));
    this.fieldErrors.update((errors) => clearBookingError(errors, field));
  }

  protected choose(value: string): void {
    this.form.update((form) => ({
      ...form,
      kind: bookingKindOf(value, form.kind),
    }));
  }

  /** Leaves, unless a send is on its way. */
  protected dismiss(): void {
    if (!this.sending()) this.ref.close(null);
  }

  /** Leaves for the conversation the request started. */
  protected goToMessages(): void {
    this.ref.close(this.professional);
  }

  protected send(event: Event): void {
    event.preventDefault();
    if (this.sending() || this.sent()) return;
    const form = this.values();
    const errors = validateBooking(form, this.target.name);
    this.fieldErrors.set(errors);
    this.refusal.set(null);
    if (Object.keys(errors).length > 0) return;
    this.sending.set(true);
    this.services
      .requestBooking(this.target.id, bookingRequestOf(form))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (answer) => {
          this.professional = answer.memberId;
          this.sending.set(false);
          this.sent.set(true);
        },
        // The dialog stays as it was, so the member can try again.
        error: (error: unknown) => {
          this.sending.set(false);
          this.refusal.set(bookingRefusalOf(error));
        },
      });
  }
}

/**
 * Opens the Request a booking dialog with the CDK Dialog (ADR 0053). `injector` is the screen's, so
 * the dialog uses the screen's `SERVICES_SERVICE`. The library's `cf-dialog` draws the scrim, so
 * there is no CDK backdrop; the CDK container is the `role="dialog"`, `aria-modal` element named by
 * the dialog's title, hides the rest of the page from assistive technology, traps focus, starts it
 * in What would you like and returns it to the opener. Escape and the scrim go through the
 * dialog's own `dismiss`, which ignores them while a send is on its way.
 */
export function openRequestBookingDialog(
  injector: Injector,
  target: RequestBookingTarget,
): DialogRef<RequestBookingResult, RequestBookingDialog> {
  return injector
    .get(CdkDialog)
    .open<RequestBookingResult, RequestBookingTarget, RequestBookingDialog>(RequestBookingDialog, {
      injector,
      data: target,
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      autoFocus: '#f-kind',
      restoreFocus: true,
      hasBackdrop: false,
      disableClose: true,
    });
}
