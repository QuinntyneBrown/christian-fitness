import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import { Toast, type ToastTone } from './toast';

/** One toast the region shows. The screen's toast store owns the list, its bound and its timers. */
export interface ToastData {
  id: string;
  tone: ToastTone;
  heading: string;
  text?: string;
  actionLabel?: string;
  actionHref?: string;
}

/**
 * The design system's toast region (docs/design-system/components/toast.html, "Accessibility"):
 * one `<section aria-label="Notifications">` present from page load, so the first toast is
 * announced. Info, success and warning toasts go into its polite `role="status"` container; each
 * danger toast is a sibling with `role="alert"`, announced at once. It shows the `toasts` it is
 * given and emits `dismissed` and `action` with a toast's id; `paused` is true while the pointer
 * is over the region or focus is inside it (either one holds it), so the store can hold its timers
 * (WCAG 2.2.1). The
 * admin console's region (`admin`) has no tab-bar offset.
 */
@Component({
  selector: 'cf-toast-region',
  imports: [Toast],
  templateUrl: './toast-region.html',
  styleUrl: './toast-region.scss',
})
export class ToastRegion {
  readonly toasts = input<readonly ToastData[]>([]);
  readonly admin = input(false, { transform: booleanAttribute });
  readonly label = input('Notifications');

  readonly dismissed = output<string>();
  readonly action = output<string>();
  readonly paused = output<boolean>();

  protected readonly polite = computed(() => this.toasts().filter((t) => t.tone !== 'danger'));
  protected readonly failures = computed(() => this.toasts().filter((t) => t.tone === 'danger'));

  private hovered = false;
  private focused = false;

  protected hover(hovered: boolean): void {
    this.hovered = hovered;
    this.report(hovered || this.focused);
  }

  protected focusIn(): void {
    this.focused = true;
    this.report(true);
  }

  /** Focus moving between two toasts is not focus leaving the region. */
  protected focusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !(event.currentTarget as HTMLElement).contains(next)) {
      this.focused = false;
      this.report(this.hovered);
    }
  }

  /** Emits `paused` only when it changes: held while either the pointer or focus is inside. */
  private wasPaused = false;
  private report(paused: boolean): void {
    if (paused === this.wasPaused) return;
    this.wasPaused = paused;
    this.paused.emit(paused);
  }
}
