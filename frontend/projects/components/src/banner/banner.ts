import { booleanAttribute, Component, input, output } from '@angular/core';

/** The design system's banner tones (docs/design-system/components/banner.html, "Variants"). */
export type BannerTone = 'info' | 'success' | 'warning' | 'danger' | 'brand';

/** The icon that names the banner's condition; each tone has a default. */
export type BannerIcon = 'info' | 'mail' | 'check' | 'wifi-off' | 'alert' | 'wrench' | 'eye';

const defaultIcon: Record<BannerTone, BannerIcon> = {
  info: 'info',
  success: 'check',
  warning: 'wifi-off',
  danger: 'alert',
  brand: 'wrench',
};

/**
 * The design system's banner (docs/design-system/components/banner.html): something true of the
 * whole app for a while, in a band under the top bar. A danger banner is announced at once
 * (`role="alert"`); every other tone politely (`role="status"`). The bold `lead` carries the
 * meaning and `text` adds a sentence; colour is never the only cue. An optional action is a link
 * (`actionHref`) or a button that emits `action`; a `dismissible` banner has a 44 px "Dismiss"
 * that emits `dismissed` (the screen then moves focus to its main heading). Words are rendered as
 * text.
 */
@Component({
  selector: 'cf-banner',
  templateUrl: './banner.html',
  styleUrl: './banner.scss',
})
export class Banner {
  readonly tone = input<BannerTone>('info');
  /** The bold lead sentence that names the condition. */
  readonly lead = input.required<string>();
  /** One sentence of detail after the lead. */
  readonly text = input<string>();
  readonly icon = input<BannerIcon>();
  readonly actionLabel = input<string>();
  readonly actionHref = input<string>();
  /** Shows "Dismiss"; leave it off while the condition is still true (offline, delayed). */
  readonly dismissible = input(false, { transform: booleanAttribute });

  /** The action, when it is a button rather than a link. */
  readonly action = output<void>();
  readonly dismissed = output<void>();

  protected glyph(): BannerIcon {
    return this.icon() ?? defaultIcon[this.tone()];
  }
}
