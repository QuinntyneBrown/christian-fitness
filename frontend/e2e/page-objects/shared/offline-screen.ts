import type { Locator, Page } from '@playwright/test';
import { ErrorScreen } from './error-screen';

/** What the offline screen of either app is opened with. */
export interface OfflineParams {
  /** The URL that failed while offline, which "Try again" loads again. */
  from?: string;
}

/**
 * The offline screen and shell offline banner of either app (L2-043 AC8, AC9; ADR 0046).
 */
export abstract class OfflineScreen extends ErrorScreen {
  readonly banner: Locator;
  readonly bannerText: Locator;

  constructor(page: Page) {
    super(page);
    this.banner = page.locator('.banner--warning[role="status"]');
    this.bannerText = this.banner.locator('.banner__text');
  }

  async open(params: OfflineParams = {}): Promise<void> {
    const query = new URLSearchParams();
    if (params.from !== undefined) query.set('from', params.from);
    const search = query.toString();
    await this.page.goto(`/offline${search ? `?${search}` : ''}`);
  }
}
