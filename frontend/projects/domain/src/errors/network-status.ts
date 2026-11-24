import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/**
 * Tracks whether the browser currently has a network connection (`navigator.onLine` and the
 * window's `online` / `offline` events; L2-043 AC8, L2-037 AC2; ADR 0046). Bothlisteners are
 * removed when the owning injector is destroyed.
 */
@Injectable({ providedIn: 'root' })
export class NetworkStatus {
  private readonly state = signal(true);

  readonly online = this.state.asReadonly();

  constructor() {
    const win = inject(DOCUMENT).defaultView;
    const destroyRef = inject(DestroyRef);
    if (!win) return;
    this.state.set(win.navigator.onLine);
    const onOnline = () => this.state.set(true);
    const onOffline = () => this.state.set(false);
    win.addEventListener('online', onOnline);
    win.addEventListener('offline', onOffline);
    destroyRef.onDestroy(() => {
      win.removeEventListener('online', onOnline);
      win.removeEventListener('offline', onOffline);
    });
  }
}
