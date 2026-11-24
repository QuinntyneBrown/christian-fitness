import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Button, ErrorPage } from '@cf/components';
import { OFFLINE_PATH, returnPathOf } from '@cf/domain';

const OFFLINE_TEXT = "Check your Wi-Fi or data, then try again when you're back online.";

/**
 * The admin app's offline screen (mock `docs/mocks/pages/admin-offline/`; L2-043 AC7, AC9; ADR
 * 0046). Opened with `skipLocationChange` when a navigation's GET or lazy route fails while
 * `navigator.onLine` is `false`; updates the address bar to `retry` with `null` history state so
 * following "Try again" reloads the destination route cleanly once online.
 */
@Component({
  selector: 'cf-offline-page',
  imports: [Button, ErrorPage],
  templateUrl: './offline-page.html',
  styleUrl: './offline-page.scss',
})
export default class OfflinePage {
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly text = OFFLINE_TEXT;
  /** The URL that failed while offline, when it is a path inside the app; else `/`. */
  protected readonly retry = returnPathOf(this.query.get('from'));

  constructor() {
    const win = inject(DOCUMENT).defaultView;
    if (win && win.location.pathname !== OFFLINE_PATH) {
      win.history.replaceState(null, '', this.retry);
    }
  }
}
