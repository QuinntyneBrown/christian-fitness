import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SESSION_SERVICE } from '@cf/api';
import { welcomeOf } from '@cf/domain';

/**
 * Home, a stand-in until slice 13.1 (ADR 0007): the mock's greeting heading, "Welcome, {first
 * name}", from the signed-in member's session. It reads "Welcome" until the session arrives, and
 * stays so when it fails: a server error shows the server-error screen (L2-043 AC4); a visitor
 * without a session is sent to sign in from slice 3.1.
 */
@Component({
  selector: 'cf-home-page',
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  protected readonly greeting = signal(welcomeOf(null));

  constructor() {
    inject(SESSION_SERVICE)
      .current()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (session) => this.greeting.set(welcomeOf(session.name)),
        error: () => undefined,
      });
  }
}
