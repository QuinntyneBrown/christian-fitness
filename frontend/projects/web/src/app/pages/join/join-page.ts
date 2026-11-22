import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ACCOUNT_SERVICE, INTERESTS, type InterestKey } from '@cf/api';
import { AuthLayout, Button, InterestPicker, TextField } from '@cf/components';
import { joinRequestOf, toggleInterest } from '@cf/domain';

/**
 * The Join screen (mock docs/mocks/pages/join/): a visitor creates an account and lands on Home,
 * signed in (L2-003 AC1). One signal per field; while the request is on its way the button reads
 * "Creating your profile…" and is disabled, and the fields hold still (L2-003 AC5). A failed
 * request gives the form back as it was; the refusals and their messages are slice 2.2's.
 */
@Component({
  selector: 'cf-join-page',
  imports: [AuthLayout, Button, InterestPicker, TextField],
  templateUrl: './join-page.html',
  styleUrl: './join-page.scss',
})
export class JoinPage {
  private readonly account = inject(ACCOUNT_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly options = INTERESTS;
  protected readonly fullName = signal('');
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly homeChurch = signal('');
  protected readonly interests = signal<readonly InterestKey[]>([]);
  protected readonly submitting = signal(false);

  protected toggle(key: InterestKey): void {
    this.interests.update((selected) => toggleInterest(selected, key));
  }

  protected submit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    const request = joinRequestOf({
      fullName: this.fullName(),
      email: this.email(),
      password: this.password(),
      homeChurch: this.homeChurch(),
      interests: this.interests(),
    });
    this.account
      .join(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => void this.router.navigateByUrl('/home'),
        // The form comes back as it was, so the visitor can try again; slice 2.2 adds the message.
        error: () => this.submitting.set(false),
      });
  }
}
